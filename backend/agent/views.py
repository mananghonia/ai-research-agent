import io
import json
import queue
import threading
import markdown
from django.http import StreamingHttpResponse, HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from xhtml2pdf import pisa

from .models import ResearchSession, ResearchStep, ResearchReport, ResearchEval
from .core.agent_loop import run_agent
from .core.guardrails import validate_topic, validate_report
from .core.evals import run_eval


@csrf_exempt
@require_http_methods(["POST"])
def start_research(request):
    try:
        body = json.loads(request.body)
        topic = body.get("topic", "").strip()
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    # ── Input guardrail ──
    result = validate_topic(topic)
    if result.failed:
        return JsonResponse({"error": " ".join(result.errors)}, status=400)

    session = ResearchSession.objects.create(topic=topic)
    return JsonResponse({"session_id": str(session.id), "topic": session.topic}, status=201)


@require_http_methods(["GET"])
def stream_research(request, session_id):
    session = get_object_or_404(ResearchSession, id=session_id)

    if session.status == "complete":
        def already_done():
            yield f"data: {json.dumps({'type': 'already_complete'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return StreamingHttpResponse(already_done(), content_type="text/event-stream")

    session.status = "running"
    session.save(update_fields=["status"])

    def event_stream():
        step_queue = queue.Queue()
        sources = []
        report_content = ""

        def run_in_thread():
            try:
                for step in run_agent(session.topic):
                    step_queue.put(step)
            except Exception as e:
                step_queue.put({"type": "error", "message": str(e)})
            finally:
                step_queue.put(None)  # sentinel — signals done

        thread = threading.Thread(target=run_in_thread, daemon=True)
        thread.start()

        try:
            while True:
                try:
                    # Wait up to 20s for next step — if nothing arrives, send a ping
                    step = step_queue.get(timeout=20)
                except queue.Empty:
                    # Keep-alive ping so Railway/proxies don't close the connection
                    yield ": ping\n\n"
                    continue

                if step is None:
                    break  # agent finished

                ResearchStep.objects.create(
                    session=session,
                    step_type=step["type"],
                    content=step,
                )

                if step["type"] == "read":
                    for r in step.get("results", []):
                        if r["url"] and not any(s["url"] == r["url"] for s in sources):
                            sources.append(r)

                if step["type"] == "report":
                    report_content = step.get("content", "")
                    sources = step.get("sources", sources)

                yield f"data: {json.dumps(step)}\n\n"

            if report_content:
                ResearchReport.objects.update_or_create(
                    session=session,
                    defaults={"content": report_content, "sources": sources},
                )
                session.status = "complete"

                # Run evals in background — don't block the SSE response
                def _run_eval_async():
                    scores = run_eval(session.topic, report_content, sources)
                    if scores:
                        ResearchEval.objects.update_or_create(
                            session=session,
                            defaults={
                                "accuracy_score":        scores["accuracy"]["score"],
                                "accuracy_reason":       scores["accuracy"]["reason"],
                                "completeness_score":    scores["completeness"]["score"],
                                "completeness_reason":   scores["completeness"]["reason"],
                                "clarity_score":         scores["clarity"]["score"],
                                "clarity_reason":        scores["clarity"]["reason"],
                                "source_quality_score":  scores["source_quality"]["score"],
                                "source_quality_reason": scores["source_quality"]["reason"],
                                "overall_score":         scores["overall"],
                            },
                        )

                threading.Thread(target=_run_eval_async, daemon=True).start()
            else:
                session.status = "failed"

        except Exception as e:
            session.status = "failed"
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            session.save(update_fields=["status"])
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


@require_http_methods(["GET"])
def get_report(request, session_id):
    session = get_object_or_404(ResearchSession, id=session_id)
    try:
        report = session.report
    except ResearchReport.DoesNotExist:
        return JsonResponse({"error": "Report not ready yet."}, status=404)

    return JsonResponse({
        "session_id": str(session.id),
        "topic": session.topic,
        "status": session.status,
        "content": report.content,
        "sources": report.sources,
        "created_at": report.created_at.isoformat(),
    })


@require_http_methods(["GET"])
def export_pdf(request, session_id):
    session = get_object_or_404(ResearchSession, id=session_id)
    try:
        report = session.report
    except ResearchReport.DoesNotExist:
        return JsonResponse({"error": "Report not ready yet."}, status=404)

    html_content = _report_to_html(session.topic, report.content, report.sources)
    pdf_buffer = io.BytesIO()
    pisa.CreatePDF(html_content, dest=pdf_buffer)
    pdf_buffer.seek(0)

    filename = f"research-{session.topic[:40].replace(' ', '-').lower()}.pdf"
    response = HttpResponse(pdf_buffer.read(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@require_http_methods(["GET"])
def get_eval(request, session_id):
    session = get_object_or_404(ResearchSession, id=session_id)
    try:
        ev = session.eval
    except ResearchEval.DoesNotExist:
        return JsonResponse({"status": "pending"}, status=202)

    return JsonResponse({
        "overall": ev.overall_score,
        "dimensions": {
            "accuracy":       {"score": ev.accuracy_score,       "reason": ev.accuracy_reason},
            "completeness":   {"score": ev.completeness_score,   "reason": ev.completeness_reason},
            "clarity":        {"score": ev.clarity_score,        "reason": ev.clarity_reason},
            "source_quality": {"score": ev.source_quality_score, "reason": ev.source_quality_reason},
        },
        "created_at": ev.created_at.isoformat(),
    })


@require_http_methods(["GET"])
def list_history(request):
    sessions = ResearchSession.objects.all()[:50]
    data = []
    for s in sessions:
        data.append({
            "session_id": str(s.id),
            "topic": s.topic,
            "status": s.status,
            "created_at": s.created_at.isoformat(),
            "has_report": ResearchReport.objects.filter(session=s).exists(),
        })
    return JsonResponse({"sessions": data})


def _report_to_html(topic: str, content: str, sources: list) -> str:
    body_html = markdown.markdown(content, extensions=["extra", "nl2br"])
    sources_html = ""
    if sources:
        items = "".join(
            f'<li><a href="{s["url"]}">{s["title"] or s["url"]}</a></li>'
            for s in sources if s.get("url")
        )
        sources_html = f"<h2>Sources</h2><ul>{items}</ul>"

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{topic}</title>
  <style>
    body {{ font-family: Georgia, serif; max-width: 800px; margin: 40px auto; color: #222; line-height: 1.7; }}
    h1 {{ color: #1a1a2e; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }}
    h2 {{ color: #16213e; margin-top: 30px; }}
    a {{ color: #0066cc; }}
    li {{ margin-bottom: 6px; }}
    ul {{ padding-left: 20px; }}
  </style>
</head>
<body>
  {body_html}
  {sources_html}
</body>
</html>"""
