"""
Guardrails — validate inputs and outputs of the research agent.

Input guardrails:  run before the agent starts
Output guardrails: run after the agent produces a report
"""

import re
from dataclasses import dataclass


# ── Result type ───────────────────────────────────────────────

@dataclass
class GuardrailResult:
    passed: bool
    errors: list[str]

    @property
    def failed(self) -> bool:
        return not self.passed


# ── Input guardrails ──────────────────────────────────────────

# Patterns that suggest prompt injection or abuse attempts
_INJECTION_PATTERNS = [
    r"ignore (all |previous |above )?instructions",
    r"you are now",
    r"disregard (all |your )?",
    r"system prompt",
    r"jailbreak",
    r"act as (a |an )?",
    r"pretend (you are|to be)",
]

_COMPILED_INJECTIONS = [re.compile(p, re.IGNORECASE) for p in _INJECTION_PATTERNS]


def validate_topic(topic: str) -> GuardrailResult:
    """Validate a research topic before the agent runs."""
    errors = []

    if not topic or not topic.strip():
        errors.append("Topic cannot be empty.")
        return GuardrailResult(passed=False, errors=errors)

    topic = topic.strip()

    if len(topic) < 5:
        errors.append("Topic is too short. Please provide more detail.")

    if len(topic) > 500:
        errors.append("Topic must be under 500 characters.")

    # Check for obvious non-research content
    if topic.replace(" ", "").isdigit():
        errors.append("Topic must be a research subject, not just numbers.")

    # Check for prompt injection attempts
    for pattern in _COMPILED_INJECTIONS:
        if pattern.search(topic):
            errors.append("Topic contains invalid content. Please enter a genuine research subject.")
            break

    return GuardrailResult(passed=len(errors) == 0, errors=errors)


# ── Output guardrails ─────────────────────────────────────────

MIN_REPORT_LENGTH = 300       # characters
MIN_SECTIONS = 2              # number of ## headings
MIN_SOURCES = 1               # at least 1 source found


def validate_report(content: str, sources: list) -> GuardrailResult:
    """Validate the final report before saving and showing it to the user."""
    errors = []

    if not content or not content.strip():
        errors.append("Report is empty.")
        return GuardrailResult(passed=False, errors=errors)

    if len(content.strip()) < MIN_REPORT_LENGTH:
        errors.append(
            f"Report is too short ({len(content.strip())} chars). "
            f"Minimum is {MIN_REPORT_LENGTH} characters."
        )

    # Count markdown headings — a proper report should have structure
    heading_count = len(re.findall(r'^#{1,3}\s+.+', content, re.MULTILINE))
    if heading_count < MIN_SECTIONS:
        errors.append(
            f"Report lacks structure (found {heading_count} section(s), "
            f"need at least {MIN_SECTIONS})."
        )

    if not sources or len(sources) < MIN_SOURCES:
        errors.append("Report has no sources. The agent must cite at least one source.")

    return GuardrailResult(passed=len(errors) == 0, errors=errors)
