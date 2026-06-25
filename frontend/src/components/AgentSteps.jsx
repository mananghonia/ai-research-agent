import { useEffect, useRef } from 'react'

const STEP_CONFIG = {
  search: {
    icon: '🔍',
    label: 'Searching the web',
    color: 'text-blue-400',
    dot: 'bg-blue-500',
    border: 'border-blue-800/60',
    bg: 'bg-blue-950/30',
  },
  read: {
    icon: '📄',
    label: 'Reading sources',
    color: 'text-emerald-400',
    dot: 'bg-emerald-500',
    border: 'border-emerald-800/60',
    bg: 'bg-emerald-950/30',
  },
  think: {
    icon: '🧠',
    label: 'Thinking',
    color: 'text-amber-400',
    dot: 'bg-amber-500',
    border: 'border-amber-800/60',
    bg: 'bg-amber-950/30',
  },
  report: {
    icon: '✅',
    label: 'Report complete',
    color: 'text-violet-400',
    dot: 'bg-violet-500',
    border: 'border-violet-800/60',
    bg: 'bg-violet-950/30',
  },
  error: {
    icon: '⚠️',
    label: 'Error',
    color: 'text-red-400',
    dot: 'bg-red-500',
    border: 'border-red-800/60',
    bg: 'bg-red-950/30',
  },
}

function StepCard({ step, isLatest, isLast }) {
  const cfg = STEP_CONFIG[step.type] || STEP_CONFIG.think

  return (
    <div className="relative flex gap-4 pb-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[18px] top-9 bottom-0 w-px bg-slate-700/60" />
      )}

      {/* Dot */}
      <div className="relative shrink-0 mt-1">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base
          ${cfg.bg} border ${cfg.border} relative z-10`}>
          {isLatest && step.type !== 'report' ? (
            <div className="flex gap-0.5">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className={`w-1 h-1 rounded-full ${cfg.dot} animate-bounce`}
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          ) : (
            <span>{cfg.icon}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-3 min-w-0`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
          {isLatest && step.type !== 'report' && (
            <span className="text-xs text-slate-500 animate-pulse">Processing...</span>
          )}
        </div>

        {step.type === 'search' && step.query && (
          <p className="mt-1.5 text-slate-300 text-sm bg-slate-800/60 rounded-lg px-3 py-1.5 font-mono">
            "{step.query}"
          </p>
        )}

        {step.type === 'read' && step.results?.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <p className="text-slate-400 text-xs font-medium">
              Found {step.results.length} sources
            </p>
            {step.results.slice(0, 3).map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 truncate group"
              >
                <span className="w-4 h-4 shrink-0 rounded bg-slate-700/60 flex items-center justify-center text-[10px] text-slate-400">
                  {i + 1}
                </span>
                <span className="truncate group-hover:underline">{r.title || r.url}</span>
              </a>
            ))}
            {step.results.length > 3 && (
              <p className="text-slate-500 text-xs">+{step.results.length - 3} more sources</p>
            )}
          </div>
        )}

        {step.type === 'think' && step.message && (
          <p className="mt-1.5 text-slate-300 text-sm italic">{step.message}</p>
        )}

        {step.type === 'error' && (
          <p className="mt-1.5 text-red-300 text-sm">{step.message}</p>
        )}
      </div>
    </div>
  )
}

export default function AgentSteps({ steps, isStreaming }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps.length])

  if (steps.length === 0 && !isStreaming) return null

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          {isStreaming && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
            </span>
          )}
          <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-widest">
            Agent Activity
          </h2>
        </div>
        <div className="flex-1 h-px bg-slate-800" />
        <span className="text-xs text-slate-500">{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Steps */}
      <div className="max-h-[420px] overflow-y-auto pr-1">
        <div className="space-y-0">
          {steps.map((step, i) => (
            <StepCard
              key={i}
              step={step}
              isLatest={i === steps.length - 1 && isStreaming}
              isLast={i === steps.length - 1}
            />
          ))}
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
