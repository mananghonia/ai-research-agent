# AI Research Agent

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

## Key Concepts Demonstrated

| Concept | Where |
|---|---|
| **ReAct loop** (Reason → Act → Observe → Repeat) | `backend/agent/core/agent_loop.py` |
| **Tool use / Function calling** | Claude API with `tavily_search` tool schema |
| **Server-Sent Events (SSE)** | Live streaming of agent steps to React frontend |
| **Context window management** | Tool results appended back into message history each loop |
| **Structured output** | Agent produces formatted markdown report, not raw text |
| **Retry logic** | Transient search failures retried silently |
| **Secure secrets management** | `python-decouple` + `.env` — keys never touch frontend or git |

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
                  (Sessions · Steps · Reports)
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
| LLM | Claude claude-sonnet-4-6 via Anthropic SDK |
| Web Search | Tavily AI Search API |
| Streaming | Server-Sent Events (`StreamingHttpResponse`) |
| PDF Export | xhtml2pdf |
| Env Security | python-decouple |
| Frontend | React + Vite + Tailwind CSS |
| Database | SQLite |

---

## Features

- **Live agent steps** — watch the agent search, read, and think in real time
- **Research history** — every session saved, revisit any past report
- **Source citations** — every report includes clickable sources with domain previews
- **Export as PDF** — download any report as a formatted PDF
- **Retry logic** — transient search errors retried silently, no crashes
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
│       ├── models.py          # ResearchSession, ResearchStep, ResearchReport
│       ├── views.py           # All API endpoints + SSE stream + PDF
│       ├── urls.py
│       └── core/
│           ├── agent_loop.py  # ← ReAct loop (main agent logic)
│           ├── tools.py       # ← Tavily tool definition + executor
│           └── prompts.py     # ← Claude system prompt
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api/research.js    # All API calls in one place
│       └── components/
│           ├── ResearchForm.jsx
│           ├── AgentSteps.jsx  # Live SSE rendering
│           ├── Report.jsx      # Final report + citations
│           └── History.jsx     # Past sessions sidebar
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
git clone https://github.com/mananghoia/ai-research-agent.git
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

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/research/start/` | Submit a topic, receive session ID |
| `GET` | `/api/research/<id>/stream/` | SSE stream of live agent steps |
| `GET` | `/api/research/<id>/report/` | Final report + sources JSON |
| `GET` | `/api/research/<id>/pdf/` | Download report as PDF |
| `GET` | `/api/history/` | List all past sessions |

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

**"How do you handle API failures?"**
> Tavily search failures are retried up to 2 times with a delay. The retry is silent — the user never sees a flash of error. If all retries fail, the agent continues with results it already has.

**"Why SQLite and not PostgreSQL?"**
> SQLite is appropriate for this scale. Django's ORM abstracts the database, so migrating to PostgreSQL for production is a one-line change in `settings.py`.

---

## License

MIT
