from tavily import TavilyClient
from decouple import config

_tavily_client = None


def get_tavily_client() -> TavilyClient:
    global _tavily_client
    if _tavily_client is None:
        _tavily_client = TavilyClient(api_key=config('TAVILY_API_KEY'))
    return _tavily_client


TAVILY_TOOL_DEFINITION = {
    "name": "tavily_search",
    "description": (
        "Search the web for current, accurate information on a topic. "
        "Use specific, targeted queries to get the best results. "
        "You can call this multiple times with different queries."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "A specific search query to find information about the topic.",
            }
        },
        "required": ["query"],
    },
}


def execute_tavily_search(query: str) -> list[dict]:
    client = get_tavily_client()
    response = client.search(query=query, max_results=5, include_raw_content=False)
    return [
        {
            "url": r.get("url", ""),
            "title": r.get("title", ""),
            "content": r.get("content", ""),
            "score": r.get("score", 0),
        }
        for r in response.get("results", [])
    ]
