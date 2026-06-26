import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { getPdfUrl } from '../api/research'
import EvalScore from './EvalScore'
import MermaidChart from './MermaidChart'

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
      <span className="shrink-0 w-6 h-6 rounded-md bg-slate-700 text-violet-400 text-xs font-bold flex items-center justify-center mt-0.5">
        {index + 1}
      </span>
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
      <span className="shrink-0 text-slate-600 group-hover:text-violet-400 transition-colors mt-0.5 text-sm">↗</span>
    </a>
  )
}

// Custom markdown components
const mdComponents = {
  // Links
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
  // Paragraphs
  p: ({ children }) => (
    <p className="break-words overflow-hidden leading-relaxed my-3">{children}</p>
  ),
  // Images — styled with caption
  img: ({ src, alt }) => (
    <figure className="my-6">
      <img
        src={src}
        alt={alt}
        className="rounded-xl border border-slate-700/60 max-w-full h-auto mx-auto block shadow-lg"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
      {alt && (
        <figcaption className="text-center text-xs text-slate-500 mt-2 italic">
          {alt}
        </figcaption>
      )}
    </figure>
  ),
  // Code blocks — mermaid gets rendered as a diagram, rest as styled code
  code: ({ node, inline, className, children, ...props }) => {
    const lang = /language-(\w+)/.exec(className || '')?.[1]
    const code = String(children).replace(/\n$/, '')

    if (!inline && lang === 'mermaid') {
      return <MermaidChart code={code} />
    }

    if (inline) {
      return (
        <code className="bg-slate-800 text-violet-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      )
    }

    return (
      <pre className="my-4 rounded-xl bg-slate-900 border border-slate-700/60 p-4 overflow-x-auto">
        <code className="text-slate-300 text-sm font-mono">{children}</code>
      </pre>
    )
  },
  // Tables
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-slate-700/60">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-800/80 text-slate-300 font-semibold">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-slate-700/40">{children}</tbody>
  ),
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider">{children}</th>,
  td: ({ children }) => <td className="px-4 py-2.5 text-slate-300">{children}</td>,
  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-violet-600 pl-4 text-slate-400 italic">
      {children}
    </blockquote>
  ),
  // Headings
  h1: ({ children }) => <h1 className="text-2xl font-bold text-slate-100 mt-8 mb-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-semibold text-slate-100 mt-6 mb-3 border-b border-slate-700/60 pb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-slate-200 mt-4 mb-2">{children}</h3>,
  // Lists
  ul: ({ children }) => <ul className="my-3 space-y-1 pl-5 list-disc marker:text-violet-500">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 space-y-1 pl-5 list-decimal marker:text-violet-500">{children}</ol>,
  li: ({ children }) => <li className="text-slate-300 leading-relaxed">{children}</li>,
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
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={mdComponents}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Eval scores */}
      <EvalScore sessionId={sessionId} />

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
