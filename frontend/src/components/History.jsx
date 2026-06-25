import { useEffect, useState } from 'react'
import { getHistory } from '../api/research'

const STATUS_DOT = {
  complete: 'bg-emerald-500',
  running:  'bg-blue-500 animate-pulse',
  pending:  'bg-slate-500',
  failed:   'bg-red-500',
}

export default function History({ onSelectSession, activeSessionId }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [activeSessionId])

  if (loading) {
    return (
      <div className="space-y-2 mt-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-800/50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="mt-4 text-center px-2">
        <p className="text-slate-600 text-xs leading-relaxed">
          Your research sessions will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {sessions.map((s) => {
        const isActive = s.session_id === activeSessionId
        const canClick = s.has_report

        return (
          <button
            key={s.session_id}
            onClick={() => canClick && onSelectSession(s.session_id)}
            disabled={!canClick}
            className={`w-full text-left rounded-lg px-3 py-2.5 transition-all group
              ${isActive
                ? 'bg-violet-600/20 border border-violet-600/50 text-white'
                : canClick
                  ? 'hover:bg-slate-800/70 border border-transparent hover:border-slate-700 text-slate-300 hover:text-slate-100'
                  : 'opacity-40 cursor-not-allowed border border-transparent text-slate-400'
              }
            `}
          >
            <div className="flex items-start gap-2.5">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[s.status] || STATUS_DOT.pending}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium leading-snug line-clamp-2">{s.topic}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
