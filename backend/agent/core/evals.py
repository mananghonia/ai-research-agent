"""
Evals — LLM-as-judge evaluation of generated research reports.

Uses Claude to score each report on 4 dimensions (0-10 each):
  - Accuracy:    Is it grounded in the sources? No hallucinations?
  - Completeness: Did it cover the topic thoroughly?
  - Clarity:     Is it well-structured and easy to read?
  - Source Quality: Are the sources credible and relevant?
"""

import json
import anthropic
from decouple import config

_client = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=config('ANTHROPIC_API_KEY'))
    return _client


EVAL_PROMPT = """You are an expert research quality evaluator. You will evaluate a research report and score it on 4 dimensions.

For each dimension, provide:
- A score from 0 to 10 (integers only)
- A one-sentence reason

## Report Topic
{topic}

## Report Content
{content}

## Sources Used
{sources}

## Instructions
Score the report on these 4 dimensions and respond ONLY with valid JSON in this exact format:
{{
  "accuracy": {{
    "score": <0-10>,
    "reason": "<one sentence>"
  }},
  "completeness": {{
    "score": <0-10>,
    "reason": "<one sentence>"
  }},
  "clarity": {{
    "score": <0-10>,
    "reason": "<one sentence>"
  }},
  "source_quality": {{
    "score": <0-10>,
    "reason": "<one sentence>"
  }}
}}

Scoring guide:
- 9-10: Excellent
- 7-8:  Good
- 5-6:  Average
- 3-4:  Below average
- 0-2:  Poor

Be honest and critical. Do not inflate scores."""


def run_eval(topic: str, content: str, sources: list) -> dict | None:
    """
    Run LLM-as-judge evaluation on a research report.
    Returns a dict with scores and reasons, or None if eval fails.
    """
    sources_text = "\n".join(
        f"- {s.get('title', 'Untitled')} ({s.get('url', '')})"
        for s in sources[:10]
    ) if sources else "No sources provided."

    prompt = EVAL_PROMPT.format(
        topic=topic,
        content=content[:6000],  # cap to avoid token overflow
        sources=sources_text,
    )

    try:
        response = get_client().messages.create(
            model="claude-haiku-4-5-20251001",  # use Haiku — faster + cheaper for evals
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()

        # Strip markdown code fences if Claude wraps the JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        scores = json.loads(raw)

        # Validate structure
        required = {"accuracy", "completeness", "clarity", "source_quality"}
        if not required.issubset(scores.keys()):
            return None

        # Clamp all scores to 0-10
        for key in required:
            scores[key]["score"] = max(0, min(10, int(scores[key]["score"])))

        # Add overall average
        avg = sum(scores[k]["score"] for k in required) / len(required)
        scores["overall"] = round(avg, 1)

        return scores

    except Exception:
        return None
