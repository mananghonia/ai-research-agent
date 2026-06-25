import ReactMarkdown from 'react-markdown'
import { getPdfUrl } from '../api/research'

function SourceCard({ source, index }) {
  const displayUrl = source.url
    ? source.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
    : ''

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3.5 hover:border-violet-600/60 hover:bg-slate-800/80 transition-all group overflow-hidden"
    >
      {/* Number badge */}
      <span className="shrink-0 w-6 h-6 rounded-md bg-slate-700 text-violet-400 text-xs font-bold flex items-center justify-center mt-0.5">
        {index + 1}
      </span>

      {/* Text — constrained, never overflows */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-sm font-medium text-slate-200 group-hover:text-violet-300 transition-colors leading-snug line-clamp-2">
          {source.title || displayUrl || 'Untitled Source'}
        </p>
        <p className="text-xs text-slate-500 mt-1 truncate">{displayUrl}</p>
        {source.content && (
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
            {source.content.slice(0, 140)}
          </p>
        )}
      </div>

      {/* Arrow */}
      <span className="shrink-0 text-slate-600 group-hover:text-violet-400 transition-colors mt-0.5 text-sm">↗</span>
    </a>
  )
}

export default function Report({ sessionId, topic, content, sources, onReset }) {
  return (
    <div className="w-full space-y-6 overflow-hidden">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Research Report</p>
          <h2 className="text-xl font-bold text-slate-100 leading-snug break-words">{topic}</h2>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={getPdfUrl(sessionId)}
            download
            className="rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2 transition-all"
          >
            ↓ PDF
          </a>
          <button
            onClick={onReset}
            className="rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            + New Research
          </button>
        </div>
      </div>

      {/* Report body */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-6 overflow-hidden">
        <div className="report-content overflow-hidden break-words">
          <ReactMarkdown
            components={{
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all"
                >
                  {children}
                </a>
              ),
              p: ({ children }) => (
                <p className="break-words overflow-hidden">{children}</p>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Sources grid */}
      {sources?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
              Sources
            </h3>
            <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
              {sources.length}
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sources.map((source, i) => (
              <SourceCard key={i} source={source} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
