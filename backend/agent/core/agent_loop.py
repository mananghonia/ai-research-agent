import time
import anthropic
from decouple import config
from .tools import TAVILY_TOOL_DEFINITION, execute_tavily_search
from .prompts import SYSTEM_PROMPT

MAX_ITERATIONS = 6

_anthropic_client = None


def get_client() -> anthropic.Anthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic(api_key=config('ANTHROPIC_API_KEY'))
    return _anthropic_client


def run_agent(topic: str):
    """
    Generator implementing the ReAct loop.
    Yields step dicts that the SSE view streams to the frontend:
      {"type": "search", "query": "..."}
      {"type": "read",   "results": [...]}
      {"type": "think",  "message": "..."}
      {"type": "report", "content": "..."}
      {"type": "error",  "message": "..."}
    """
    client = get_client()
    messages = [{"role": "user", "content": f"Research this topic thoroughly: {topic}"}]
    all_sources = []

    for iteration in range(MAX_ITERATIONS):
        try:
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=8096,
                system=SYSTEM_PROMPT,
                tools=[TAVILY_TOOL_DEFINITION],
                messages=messages,
            )
        except anthropic.APIError as e:
            yield {"type": "error", "message": f"Claude API error: {str(e)}"}
            return

        # Agent finished — extract the final report text
        if response.stop_reason in ("end_turn", "max_tokens"):
            report_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    report_text += block.text

            yield {
                "type": "report",
                "content": report_text,
                "sources": all_sources,
            }
            return

        # Agent wants to call a tool
        if response.stop_reason == "tool_use":
            tool_results = []

            for block in response.content:
                if block.type == "tool_use" and block.name == "tavily_search":
                    query = block.input.get("query", "")

                    yield {"type": "search", "query": query}

                    results = _search_with_retry(query)

                    # Collect unique sources
                    for r in results:
                        if r["url"] and not any(s["url"] == r["url"] for s in all_sources):
                            all_sources.append(r)

                    yield {"type": "read", "results": results, "query": query}

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": _format_results_for_claude(results),
                    })

            # Feed results back into the conversation and loop
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

        else:
            # Unexpected stop reason
            yield {"type": "error", "message": f"Unexpected stop reason: {response.stop_reason}"}
            return

    # Reached max iterations — force a final report
    yield {"type": "think", "message": "Reached max search iterations. Writing final report now."}
    try:
        final_response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8096,
            system=SYSTEM_PROMPT,
            messages=messages + [{
                "role": "user",
                "content": "You have enough information. Write the final research report now."
            }],
        )
        report_text = ""
        for block in final_response.content:
            if hasattr(block, "text"):
                report_text += block.text
        yield {"type": "report", "content": report_text, "sources": all_sources}
    except anthropic.APIError as e:
        yield {"type": "error", "message": f"Failed to generate final report: {str(e)}"}


def _search_with_retry(query: str, retries: int = 2, delay: float = 1.5) -> list[dict]:
    """Retry Tavily search on transient connection errors — silently, no UI error shown."""
    last_err = None
    for attempt in range(retries):
        try:
            return execute_tavily_search(query)
        except Exception as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(delay)
    # All retries exhausted — return empty so the agent can continue without crashing
    return []


def _format_results_for_claude(results: list[dict]) -> str:
    if not results:
        return "No results found for this search."
    lines = []
    for i, r in enumerate(results, 1):
        lines.append(f"[Source {i}] {r['title']}\nURL: {r['url']}\n{r['content']}\n")
    return "\n".join(lines)
