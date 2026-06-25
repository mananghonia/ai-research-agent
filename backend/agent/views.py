import io
import json
import markdown
from django.http import StreamingHttpResponse, HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from xhtml2pdf import pisa

from .models import ResearchSession, ResearchStep, ResearchReport
from .core.agent_loop import run_agent


@csrf_exempt
@require_http_methods(["POST"])
def start_research(request):
    try:
        body = json.loads(request.body)
        topic = body.get("topic", "").strip()
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    if not topic:
        return JsonResponse({"error": "topic is required."}, status=400)
    if len(topic) > 500:
        return JsonResponse({"error": "topic must be under 500 characters."}, status=400)

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
        sources = []
        report_content = ""

        try:
            for step in run_agent(session.topic):
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
def list_history(request):
    sessions = ResearchSession.objects.all()[:50]
    data = []
    for s in sessions:
        data.append({
            "session_id": str(s.id),
            "topic": s.topic,
            "status": s.status,
            "created_at": s.created_at.isoformat(),
            "has_report": hasattr(s, "report") and ResearchReport.objects.filter(session=s).exists(),
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
