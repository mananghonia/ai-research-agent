import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import EvalScore from './EvalScore'
import MermaidChart from './MermaidChart'

// Escape $ followed by a digit (currency) so KaTeX doesn't treat it as math.
function preprocessMarkdown(content) {
  if (!content) return content
  return content.replace(/(?<![\$\\])\$(?=\d)/g, '\\$')
}

// Build a clean, white, print-ready HTML document from the rendered DOM content.
function buildPrintHTML(topic, bodyHTML, date) {
  const safeTitle = topic.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${safeTitle}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
<style>
@page { margin: 2cm 2.5cm; size: A4; }
*, *::before, *::after { box-sizing: border-box; }
body {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 11pt;
  line-height: 1.75;
  color: #1a1a1a;
  background: #ffffff;
  margin: 0; padding: 0;
}
/* ── Document header ── */
.doc-header {
  margin-bottom: 22pt;
  padding-bottom: 12pt;
  border-bottom: 3pt solid #7c3aed;
}
.doc-header h1 {
  font-size: 22pt; font-weight: 700; color: #111;
  line-height: 1.25; margin: 0 0 5pt;
}
.doc-meta {
  font-family: system-ui, sans-serif;
  font-size: 9pt; color: #888; margin: 0;
}
/* ── Reset Tailwind dark classes ── */
[class] { background-color: transparent !important; border-color: #e0e0e0 !important; }
[class*="text-slate-"], [class*="text-gray-"] { color: #1a1a1a !important; }
[class*="text-violet-"] { color: #5b21b6 !important; }
[class*="text-emerald-"] { color: #059669 !important; }
[class*="text-blue-"] { color: #2563eb !important; }
[class*="text-amber-"] { color: #b45309 !important; }
[class*="text-red-"] { color: #dc2626 !important; }
/* ── Score bars (need explicit BG) ── */
.bg-emerald-500 { background-color: #10b981 !important; }
.bg-blue-500    { background-color: #3b82f6 !important; }
.bg-amber-500   { background-color: #f59e0b !important; }
.bg-red-500     { background-color: #ef4444 !important; }
/* ── Report card ── */
.report-card { background: transparent !important; border: none !important; padding: 0 !important; }
/* ── Typography ── */
.report-content { color: #1a1a1a; }
h1 { font-size: 20pt; color: #111; margin: 18pt 0 8pt; line-height: 1.3; page-break-after: avoid; }
h2 { font-size: 14pt; color: #222; margin: 15pt 0 6pt; padding-bottom: 4pt; border-bottom: 1pt solid #e0e0e0 !important; page-break-after: avoid; }
h3 { font-size: 12pt; color: #333; margin: 12pt 0 4pt; page-break-after: avoid; }
h4 { font-size: 10pt; color: #555; margin: 9pt 0 3pt; text-transform: uppercase; letter-spacing: 0.04em; font-family: system-ui, sans-serif; }
p  { margin: 5pt 0; color: #1a1a1a; }
strong { font-weight: 700; color: #111; }
em     { font-style: italic; color: #444; }
hr { border: none; border-top: 1pt solid #e0e0e0 !important; margin: 10pt 0; }
a  { color: #5b21b6; word-break: break-all; }
ul, ol { margin: 6pt 0; padding-left: 18pt; }
li { margin: 2pt 0; color: #1a1a1a; line-height: 1.6; }
ul li::marker { color: #7c3aed; }
ol li::marker { color: #7c3aed; }
blockquote {
  border-left: 4pt solid #7c3aed !important;
  background: #f9f5ff !important;
  padding: 8pt 12pt; margin: 10pt 0;
  font-style: italic; color: #444;
}
code {
  background: #f3f0ff !important;
  color: #5b21b6;
  padding: 1pt 4pt;
  border-radius: 3pt;
  font-family: 'Courier New', monospace;
  font-size: 9pt;
}
pre {
  background: #f8f8f8 !important;
  border: 1pt solid #e0e0e0 !important;
  padding: 10pt; border-radius: 4pt;
  overflow: hidden; page-break-inside: avoid; margin: 8pt 0;
}
pre code { background: none !important; padding: 0; color: #333; font-size: 9pt; }
/* ── Tables ── */
div[class*="overflow-x-auto"] { overflow: visible !important; }
table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; page-break-inside: avoid; }
th {
  background: #f0ecff !important;
  color: #333 !important;
  border: 1pt solid #d8d0f0 !important;
  padding: 6pt 10pt; text-align: left;
  font-size: 9pt; font-family: system-ui, sans-serif; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
}
td { border: 1pt solid #e0e0e0 !important; padding: 5pt 10pt; color: #1a1a1a !important; vertical-align: top; }
tbody tr:nth-child(even) td { background: #fafafa !important; }
/* ── KaTeX math ── */
.katex-display {
  background: #f8f5ff !important;
  border: 1pt solid #e9d5ff !important;
  border-radius: 4pt; padding: 10pt; margin: 10pt 0;
  page-break-inside: avoid; overflow: hidden;
}
.katex-display .katex, .katex { color: #4c1d95; }
/* ── Mermaid diagrams ── */
.mermaid-wrapper {
  background: #f8f8ff !important;
  border: 1pt solid #e0e0e0 !important;
  border-radius: 6pt; padding: 14pt 8pt;
  margin: 12pt 0; page-break-inside: avoid;
  display: flex !important; justify-content: center;
}
.mermaid-wrapper > div { display: flex !important; justify-content: center; width: 100%; min-height: 0 !important; }
.mermaid-wrapper svg { max-width: 100% !important; height: auto !important; display: block; }
/* ── Images ── */
img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
figure { margin: 10pt 0; page-break-inside: avoid; }
figcaption { text-align: center; font-size: 8.5pt; color: #888; margin-top: 4pt; font-style: italic; font-family: system-ui, sans-serif; }
/* ── Eval section ── */
.eval-card {
  border: 1pt solid #e0e0e0 !important;
  border-radius: 6pt; padding: 10pt 14pt;
  margin: 14pt 0; page-break-inside: avoid;
}
.eval-card > div { border: none !important; background: transparent !important; }
/* Score bar track */
.h-1\\.5 { background: #e0e0e0 !important; height: 4pt !important; border-radius: 99pt; overflow: hidden; }
/* ── Sources ── */
.sources-section { margin-top: 16pt; }
.source-card-grid { display: block !important; }
.source-card-item {
  display: block !important;
  background: #fafafa !important;
  border: 1pt solid #e0e0e0 !important;
  border-radius: 4pt; padding: 7pt 10pt;
  margin: 5pt 0; page-break-inside: avoid;
  color: #1a1a1a !important; text-decoration: none;
}
.source-card-item p { margin: 0 !important; font-size: 10pt; }
.source-url    { color: #5b21b6 !important; font-size: 8.5pt !important; display: block; }
.source-snippet{ color: #666    !important; font-size: 8.5pt !important; display: block; margin-top: 2pt; }
/* ── Hide all UI chrome ── */
.no-print, .print-header, button,
[class*="animate-"], [class*="shrink-0"][class*="rounded-full"],
[class*="border-t-transparent"] { display: none !important; }
/* Sources divider row */
.flex.items-center.gap-3 .flex-1 { display: none !important; }
</style>
</head>
<body>
<div class="doc-header">
  <h1>${safeTitle}</h1>
  <p class="doc-meta">Generated by AI Research Agent &middot; ${date}</p>
</div>
${bodyHTML}
</body>
</html>`
}

// ── Source card ────────────────────────────────────────────
function SourceCard({ source, index }) {
  const displayUrl = source.url
    ? source.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
    : ''
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer"
      className="source-card-item flex items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3.5 hover:border-violet-600/60 hover:bg-slate-800/80 transition-all group overflow-hidden">
      <span className="shrink-0 w-6 h-6 rounded-md bg-slate-700 text-violet-400 text-xs font-bold flex items-center justify-center mt-0.5">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-sm font-medium text-slate-200 group-hover:text-violet-300 transition-colors leading-snug line-clamp-2">
          {source.title || displayUrl || 'Untitled Source'}
        </p>
        <p className="source-url text-xs text-slate-500 mt-1 truncate">{displayUrl}</p>
        {source.content && (
          <p className="source-snippet text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
            {source.content.slice(0, 140)}
          </p>
        )}
      </div>
      <span className="shrink-0 text-slate-600 group-hover:text-violet-400 transition-colors mt-0.5 text-sm">↗</span>
    </a>
  )
}

// ── Markdown components ─────────────────────────────────────
const mdComponents = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all">{children}</a>
  ),
  p: ({ children }) => (
    <p className="break-words overflow-hidden leading-relaxed my-3 text-slate-300">{children}</p>
  ),
  img: ({ src, alt }) => (
    <figure className="my-6">
      <img src={src} alt={alt}
        className="rounded-xl border border-slate-700/60 max-w-full h-auto mx-auto block shadow-lg"
        onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
      {alt && <figcaption className="text-center text-xs text-slate-500 mt-2 italic">{alt}</figcaption>}
    </figure>
  ),
  code: ({ className, children }) => {
    const lang = /language-(\w+)/.exec(className || '')?.[1]
    const raw = String(children)
    const isBlock = raw.includes('\n') || lang
    if (lang === 'mermaid') return <div className="mermaid-wrapper"><MermaidChart code={raw.trim()} /></div>
    if (!isBlock) return <code className="bg-slate-800 text-violet-300 px-1.5 py-0.5 rounded text-[0.85em] font-mono">{children}</code>
    return (
      <pre className="my-4 rounded-xl bg-slate-900 border border-slate-700/60 p-4 overflow-x-auto">
        <code className={`text-slate-300 text-sm font-mono ${className || ''}`}>{children}</code>
      </pre>
    )
  },
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto rounded-xl border border-slate-700/60">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-800/80">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-700/40">{children}</tbody>,
  tr:   ({ children }) => <tr className="hover:bg-slate-800/40 transition-colors">{children}</tr>,
  th:   ({ children }) => <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{children}</th>,
  td:   ({ children }) => <td className="px-4 py-3 text-slate-300 align-top">{children}</td>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-violet-600 pl-4 text-slate-400 italic bg-violet-950/10 py-2 pr-4 rounded-r-lg">{children}</blockquote>
  ),
  h1: ({ children }) => <h1 className="text-2xl font-bold text-slate-100 mt-8 mb-4 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-semibold text-slate-100 mt-7 mb-3 pb-2 border-b border-slate-700/60">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-slate-200 mt-5 mb-2">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold text-slate-300 mt-4 mb-1.5 uppercase tracking-wide">{children}</h4>,
  ul: ({ children }) => <ul className="my-3 space-y-1.5 pl-5 list-disc marker:text-violet-500">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 space-y-1.5 pl-5 list-decimal marker:text-violet-500">{children}</ol>,
  li: ({ children }) => <li className="text-slate-300 leading-relaxed pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
  em:     ({ children }) => <em className="italic text-slate-400">{children}</em>,
  hr: () => <hr className="my-6 border-slate-700/60" />,
}

// ── Report component ────────────────────────────────────────
export default function Report({ sessionId, topic, content, sources, onReset }) {

  const handlePrint = () => {
    const el = document.getElementById('report-printable')
    if (!el) { window.print(); return }

    // Clone so we can strip UI-only elements
    const clone = el.cloneNode(true)
    clone.querySelectorAll('.no-print, .print-header, button').forEach(e => e.remove())

    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    })

    const win = window.open('', '_blank')
    if (!win) { window.print(); return }

    win.document.open()
    win.document.write(buildPrintHTML(topic, clone.innerHTML, date))
    win.document.close()

    // Give KaTeX CDN CSS time to load before printing
    setTimeout(() => { win.focus(); win.print() }, 800)
  }

  return (
    <div className="w-full space-y-6 overflow-hidden">

      {/* Screen-only header — hidden in print window */}
      <div className="no-print flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Research Report</p>
          <h2 className="text-xl font-bold text-slate-100 leading-snug break-words">{topic}</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2 transition-all"
            title="Opens a clean PDF-ready print preview">
            <span className="text-base leading-none">↓</span> Save as PDF
          </button>
          <button onClick={onReset}
            className="rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 transition-colors">
            + New Research
          </button>
        </div>
      </div>

      <p className="no-print text-xs text-slate-600 -mt-4">
        Opens a clean print preview — select <em>Save as PDF</em> in the dialog.
      </p>

      {/* Everything below here is captured for the PDF */}
      <div id="report-printable" className="space-y-6">

        {/* Report body */}
        <div className="report-card rounded-xl border border-slate-700/60 bg-slate-800/30 p-6 overflow-hidden">
          <div className="report-content overflow-hidden break-words">
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
              components={mdComponents}
            >
              {preprocessMarkdown(content)}
            </ReactMarkdown>
          </div>
        </div>

        {/* Eval scores */}
        <div className="eval-card">
          <EvalScore sessionId={sessionId} />
        </div>

        {/* Sources */}
        {sources?.length > 0 && (
          <div className="sources-section space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Sources</h3>
              <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">{sources.length}</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
            <div className="source-card-grid grid grid-cols-1 gap-2 sm:grid-cols-2">
              {sources.map((source, i) => (
                <SourceCard key={i} source={source} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
