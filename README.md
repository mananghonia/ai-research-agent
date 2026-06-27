# AI Research Agent

**Live Demo → https://ai-research-agent-sigma-rosy.vercel.app**

An autonomous AI agent that researches any topic by searching the web, reading sources, and producing a structured report — all in real time.

Built with **Django + React + Claude API (Tool Use) + Tavily Search**.

---

## What It Does

Type a research topic → the agent autonomously:

1. Decides what to search
2. Calls the Tavily web search tool
3. Reads and analyzes the results
4. Decides if it needs more information (loops back) or has enough
5. Writes a structured markdown report with source citations
6. Streams every step live to the UI as it happens

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│                                                              │
│  ResearchForm  ──POST──►  /api/research/start/              │
│  AgentSteps    ◄──SSE───  /api/research/<id>/stream/        │
│  Report        ◄──GET───  /api/research/<id>/report/        │
│  History       ◄──GET───  /api/history/                     │
└─────────────────────────────────────────────────────────────┘
                              │
                    Django REST Framework
                              │
                 ┌────────────▼────────────┐
                 │      Agent Core          │
                 │                          │
                 │  ┌──────────────────┐   │
                 │  │   agent_loop.py  │   │
                 │  │                  │   │
                 │  │  1. Call Claude  │   │
                 │  │  2. Tool use?    │   │
                 │  │     └► Tavily   │   │
                 │  │  3. Feed back   │   │
                 │  │  4. Loop / done │   │
                 │  └──────────────────┘   │
                 └────────────┬────────────┘
                              │
               ┌──────────────┴──────────────┐
               │                             │
        Claude API                     Tavily API
     (Reasoning + Writing)          (Web Search)
               │                             │
               └──────────────┬──────────────┘
                               │
                         SQLite Database
                  (Sessions · Steps · Reports · Evals)
```

---

## ReAct Loop — How the Agent Thinks

```
User: "Research the future of quantum computing"
          │
          ▼
  ┌──────────────┐
  │    REASON    │  Claude decides: "I should search for recent quantum
  │              │   computing breakthroughs and industry applications"
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │     ACT      │  Calls tavily_search("quantum computing breakthroughs 2025")
  │  (Tool Use)  │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │    OBSERVE   │  Reads 5 search results, adds to context
  │              │
  └──────┬───────┘
         │
    Need more info?
    ┌────┴────┐
   YES       NO
    │         │
    ▼         ▼
  Loop     Write structured report
  again    with citations → stream to UI
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 5 + Django REST Framework |
| LLM | Claude Sonnet 4.6 via Anthropic SDK |
| Web Search | Tavily AI Search API |
| Streaming | Server-Sent Events (`StreamingHttpResponse`) |
| Math rendering | KaTeX (remark-math + rehype-katex) |
| Diagram rendering | Mermaid.js (flowchart, timeline, pie, xy-chart, quadrant) |
| PDF export | Hidden iframe + browser print dialog |
| Rate limiting | Django LocMemCache (per-IP hourly + global daily) |
| Env security | python-decouple |
| Frontend | React + Vite + Tailwind CSS v4 |
| Database | SQLite |
| Tests | Django TestCase + unittest.mock (39 tests) |

---

## Features

- **Live agent steps** — watch the agent search, read, and think in real time
- **Rich reports** — KaTeX math equations, Mermaid diagrams, tables, code blocks, source citations
- **LLM-as-judge evals** — Claude Haiku scores each report on Accuracy, Completeness, Clarity, and Source Quality
- **Research history** — every session saved, revisit any past report
- **PDF export** — clean white-background PDF with suppressed browser headers
- **Retry on failure** — Tavily errors are retried silently; if all retries fail, Claude is notified via `is_error: True` and picks a different query
- **Rate limiting** — 10 requests/hour per IP, 150/day global cap to protect API budget
- **Input/output guardrails** — injection detection, length validation, report structure checks
- **Security-first** — API keys server-side only, never exposed to the browser

---

## Project Structure

```
ai-research-agent/
├── backend/
│   ├── config/
│   │   ├── settings.py        # Reads all secrets from .env
│   │   └── urls.py
│   └── agent/
│       ├── models.py          # ResearchSession, ResearchStep, ResearchReport, ResearchEval
│       ├── views.py           # All API endpoints + SSE stream
│       ├── rate_limit.py      # Per-IP + global rate limiting via Django cache
│       ├── urls.py
│       ├── core/
│       │   ├── agent_loop.py  # ← ReAct loop (main agent logic)
│       │   ├── tools.py       # ← Tavily tool definition + executor
│       │   ├── prompts.py     # ← Claude system prompt
│       │   ├── guardrails.py  # ← Input/output validation
│       │   └── evals.py       # ← LLM-as-judge scoring via Claude Haiku
│       └── tests/
│           ├── test_guardrails.py  # 17 tests — topic + report validation
│           ├── test_evals.py       # 9 tests  — scoring, JSON parsing, error paths
│           └── test_agent_loop.py  # 13 tests — ReAct loop integration tests
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api/research.js    # All API calls in one place
│       └── components/
│           ├── ResearchForm.jsx
│           ├── AgentSteps.jsx   # Live SSE rendering
│           ├── Report.jsx       # Final report + PDF export
│           ├── EvalScore.jsx    # Score display with dimension breakdown
│           ├── MermaidChart.jsx # Mermaid diagram renderer with auto-type detection
│           └── History.jsx      # Past sessions sidebar
├── .env.example               # Safe to commit — no real keys
└── .gitignore                 # .env always excluded
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Anthropic API key — [console.anthropic.com](https://console.anthropic.com)
- Tavily API key — [app.tavily.com](https://app.tavily.com) (free tier: 1000 searches/month)

### 1. Clone the repo

```bash
git clone https://github.com/mananghonia/ai-research-agent.git
cd ai-research-agent
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp ../.env.example .env
```

```env
ANTHROPIC_API_KEY=your-anthropic-api-key
TAVILY_API_KEY=your-tavily-api-key
DJANGO_SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

Run migrations and start the server:

```bash
python manage.py migrate
python manage.py runserver
```

### 3. Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

### 4. Open the app

Visit **http://localhost:5174** (or whichever port Vite assigns).

### 5. Run the tests

```bash
cd backend
python manage.py test agent.tests
# Ran 39 tests in ~4s  OK
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/research/start/` | Submit a topic, receive session ID |
| `GET` | `/api/research/<id>/stream/` | SSE stream of live agent steps |
| `GET` | `/api/research/<id>/report/` | Final report + sources JSON |
| `GET` | `/api/research/<id>/eval/` | LLM eval scores for the report |
| `GET` | `/api/history/` | List all past sessions |

---

## Key Concepts Demonstrated

| Concept | Where |
|---|---|
| **ReAct loop** (Reason → Act → Observe → Repeat) | `backend/agent/core/agent_loop.py` |
| **Tool use / Function calling** | Claude API with `tavily_search` tool schema |
| **Server-Sent Events (SSE)** | Live streaming of agent steps to React frontend |
| **Context window management** | Tool results appended back into message history each loop |
| **LLM-as-judge evals** | Claude Haiku scores the output on 4 dimensions |
| **Retry with error signalling** | `SearchError` + `is_error: True` tool result tells Claude to try a different query |
| **Rate limiting** | Django LocMemCache — no Redis needed for single-process deployment |
| **Input/output guardrails** | Injection detection, length bounds, report structure validation |
| **Secure secrets management** | `python-decouple` + `.env` — keys never touch frontend or git |

---

## Security

- All API keys stored in `.env` — excluded from git via `.gitignore`
- `.env.example` committed with placeholder values only
- `python-decouple` raises a clear error if any required key is missing
- React frontend never receives or handles any API key
- CORS restricted to the React dev origin only

---

## Interview Talking Points

**"How does the agent know when to stop searching?"**
> The ReAct loop runs up to 6 iterations. Claude decides at each step whether to call `tavily_search` again or write the final report. When it has enough information, its stop reason changes from `tool_use` to `end_turn`.

**"How do you stream the steps to the frontend?"**
> Django's `StreamingHttpResponse` with `text/event-stream` content type. React uses the native `EventSource` API. No WebSockets needed — SSE is simpler for one-way server-to-client streaming.

**"How do you handle search failures?"**
> Tavily failures are retried up to 2 times with a delay. If all retries fail, the agent sends `is_error: True` in the tool result — this is the Anthropic-specified way to signal tool failure. Claude then picks a different search query rather than getting stuck.

**"How do you prevent someone from exhausting your API budget?"**
> Rate limiting via Django's built-in `LocMemCache` — 10 requests per IP per hour, 150 globally per day. No Redis needed. Returns HTTP 429 with a user-facing message.

**"How do you evaluate report quality?"**
> A separate Claude Haiku call runs asynchronously after the report is saved. It scores Accuracy, Completeness, Clarity, and Source Quality on a 1-10 scale with a rubric, then returns the overall average. The scores appear in the UI once ready.

**"Why SQLite and not PostgreSQL?"**
> SQLite is appropriate for this scale. Django's ORM abstracts the database, so migrating to PostgreSQL for production is a one-line change in `settings.py`.

---

## License

MIT
