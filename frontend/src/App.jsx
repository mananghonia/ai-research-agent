import { useState } from 'react'
import ResearchForm from './components/ResearchForm'
import AgentSteps from './components/AgentSteps'
import Report from './components/Report'
import History from './components/History'
import { startResearch, getReport, createEventSource } from './api/research'

export default function App() {
  const [steps, setSteps] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [report, setReport] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [topic, setTopic] = useState('')
  const [error, setError] = useState(null)
  const [activeHistoryId, setActiveHistoryId] = useState(null)

  const handleSubmit = async (researchTopic) => {
    setError(null)
    setSteps([])
    setReport(null)
    setTopic(researchTopic)
    setIsStreaming(true)

    try {
      const { session_id } = await startResearch(researchTopic)
      setSessionId(session_id)

      const es = createEventSource(session_id)

      es.onmessage = (event) => {
        const step = JSON.parse(event.data)

        if (step.type === 'done') {
          es.close()
          setIsStreaming(false)
          return
        }
        if (step.type === 'already_complete') {
          es.close()
          setIsStreaming(false)
          loadReport(session_id)
          return
        }
        if (step.type === 'report') {
          setSteps((prev) => [...prev, step])
          setReport({ content: step.content, sources: step.sources || [] })
          return
        }
        setSteps((prev) => [...prev, step])
      }

      es.onerror = () => {
        es.close()
        setIsStreaming(false)
        setError('Connection lost. Try refreshing.')
      }
    } catch (err) {
      setIsStreaming(false)
      setError(err.response?.data?.error || 'Something went wrong. Check the backend is running.')
    }
  }

  const loadReport = async (sid) => {
    try {
      const data = await getReport(sid)
      setSessionId(sid)
      setTopic(data.topic)
      setReport({ content: data.content, sources: data.sources })
      setSteps([])
      setActiveHistoryId(sid)
    } catch {
      setError('Could not load that report.')
    }
  }

  const handleReset = () => {
    setSteps([])
    setReport(null)
    setSessionId(null)
    setTopic('')
    setError(null)
    setIsStreaming(false)
    setActiveHistoryId(null)
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0b0f1a' }}>

      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-slate-800/80"
        style={{ background: '#0d1117' }}>

        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-violet-900/40">
              AI
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Research Agent</h1>
              <p className="text-[11px] text-slate-500 leading-tight">Claude + Tavily</p>
            </div>
          </div>
        </div>

        {/* New Research button */}
        <div className="px-4 pt-4">
          <button
            onClick={handleReset}
            className="w-full flex items-center gap-2 rounded-lg border border-slate-700 hover:border-violet-600 bg-slate-800/50 hover:bg-violet-950/40 text-slate-300 hover:text-violet-300 text-sm font-medium px-3 py-2.5 transition-all"
          >
            <span className="text-base">+</span>
            New Research
          </button>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
          <p className="text-[11px] text-slate-600 font-semibold uppercase tracking-widest mb-2 px-1">
            Recent
          </p>
          <History onSelectSession={loadReport} activeSessionId={activeHistoryId || sessionId} />
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Top bar */}
        <header className="shrink-0 border-b border-slate-800/80 px-8 py-3.5 flex items-center gap-3"
          style={{ background: '#0d1117' }}>
          {isStreaming ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
              </span>
              <span className="text-slate-300 text-sm font-medium">Agent is researching</span>
              <span className="text-slate-600 text-sm">·</span>
              <span className="text-slate-500 text-sm truncate">{topic}</span>
            </>
          ) : report ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-300 text-sm font-medium">Research complete</span>
              <span className="text-slate-600 text-sm">·</span>
              <span className="text-slate-500 text-sm truncate max-w-lg">{topic}</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              <span className="text-slate-500 text-sm">Ready to research</span>
            </>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-10 space-y-8 w-full">

            {/* Hero / Form */}
            {!report && (
              <div className="space-y-6">
                {!isStreaming && (
                  <div className="text-center space-y-2 pb-2">
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                      What do you want to research?
                    </h2>
                    <p className="text-slate-400 text-base">
                      The agent searches the web, reads sources, and writes a structured report — automatically.
                    </p>
                  </div>
                )}
                <ResearchForm onSubmit={handleSubmit} isLoading={isStreaming} topic={topic} />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-800/60 bg-red-950/30 px-4 py-3.5">
                <span className="text-red-400 text-base shrink-0">⚠️</span>
                <p className="text-red-300 text-sm leading-relaxed">{error}</p>
              </div>
            )}

            {/* Spinner while starting */}
            {isStreaming && steps.length === 0 && (
              <div className="flex items-center gap-3 text-slate-400 py-4">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="text-sm">Initializing agent...</span>
              </div>
            )}

            {/* Live agent steps */}
            {steps.length > 0 && !report && (
              <AgentSteps steps={steps} isStreaming={isStreaming} />
            )}

            {/* Final report */}
            {report && (
              <Report
                sessionId={sessionId}
                topic={topic}
                content={report.content}
                sources={report.sources}
                onReset={handleReset}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
