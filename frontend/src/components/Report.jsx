import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import EvalScore from './EvalScore'
import MermaidChart from './MermaidChart'

function esc(s) {
  return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Escape currency $ signs before digits so KaTeX doesn't treat them as math
function preprocessMarkdown(content) {
  if (!content) return content
  return content.replace(/(?<![\$\\])\$(?=\d)/g, '\\$')
}

// ─────────────────────────────────────────────────────────────
// Build a complete, standalone, white-background HTML document.
// Loaded inside a hidden iframe so it never touches the dark UI.
// KaTeX is loaded from CDN so math fonts render; everything else
// uses inline <style> with no external dependencies.
// ─────────────────────────────────────────────────────────────
function buildPrintHTML(topic, bodyHTML, date) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(topic)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
<style>
/* ── Page ── */
@page { margin: 2cm 2.4cm; size: A4; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.75; color: #111; background: #fff; }

/* ── Doc header ── */
.doc-header { padding-bottom: 14pt; margin-bottom: 26pt; border-bottom: 3pt solid #7c3aed; }
.doc-label { font-family: system-ui, sans-serif; font-size: 7.5pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #7c3aed; margin-bottom: 6pt; }
.doc-header h1 { font-size: 22pt; font-weight: 700; color: #111; line-height: 1.25; margin-bottom: 5pt; }
.doc-meta { font-family: system-ui, sans-serif; font-size: 9pt; color: #999; }

/* ── Reset Tailwind dark-mode classes (no Tailwind CSS is loaded here) ── */
[class*="bg-slate"],[class*="bg-gray"],[class*="bg-zinc"],[class*="bg-violet"],[class*="bg-neutral"] { background-color: transparent !important; }
[class*="border-slate"],[class*="border-gray"],[class*="border-violet"] { border-color: #e0e0e0 !important; }
[class*="text-slate"],[class*="text-gray"] { color: #1a1a1a !important; }
[class*="text-violet"] { color: #5b21b6 !important; }

/* ── Report card ── */
.report-card { background: transparent !important; border: none !important; padding: 0 !important; }
.report-content { color: #111; }

/* ── Typography ── */
h1 { font-size: 20pt; color: #111; margin: 18pt 0 8pt; line-height: 1.3; page-break-after: avoid; }
h2 { font-size: 14pt; color: #1a1a1a; margin: 16pt 0 6pt; padding-bottom: 5pt; border-bottom: 1pt solid #ddd !important; page-break-after: avoid; }
h3 { font-size: 12pt; color: #222; margin: 12pt 0 4pt; font-weight: 600; page-break-after: avoid; }
h4 { font-size: 10pt; color: #444; margin: 10pt 0 3pt; text-transform: uppercase; letter-spacing: .05em; font-family: system-ui, sans-serif; font-weight: 600; }
p  { margin: 5pt 0; color: #1a1a1a; }
strong { font-weight: 700; color: #111; }
em { font-style: italic; }
a  { color: #5b21b6; word-break: break-all; }
hr { border: none; border-top: 1pt solid #e0e0e0 !important; margin: 12pt 0; }
ul, ol { margin: 6pt 0; padding-left: 20pt; }
li { margin: 3pt 0; line-height: 1.65; color: #1a1a1a; }
ul li::marker { color: #7c3aed; }
ol li::marker { color: #7c3aed; font-weight: 600; }
blockquote { border-left: 4pt solid #7c3aed !important; background: #f9f5ff !important; padding: 8pt 14pt; margin: 10pt 0; font-style: italic; color: #444; page-break-inside: avoid; }
blockquote p { color: #444; }
code { background: #f3f0ff !important; color: #5b21b6; padding: 1pt 4pt; border-radius: 3pt; font-family: 'Courier New', monospace; font-size: 9pt; }
pre { background: #f8f8f8 !important; border: 1pt solid #e0e0e0 !important; padding: 10pt; border-radius: 4pt; margin: 8pt 0; overflow: hidden; page-break-inside: avoid; }
pre code { background: none !important; padding: 0; color: #333; font-size: 9pt; }

/* ── Tables ── */
div[class*="overflow"] { overflow: visible !important; border: none !important; padding: 0 !important; border-radius: 0 !important; }
table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; page-break-inside: avoid; }
thead { background: #f0ecff !important; }
th { background: #f0ecff !important; color: #333 !important; border: 1pt solid #d4c8f0 !important; padding: 6pt 10pt; text-align: left; font-size: 8.5pt; font-family: system-ui, sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
td { border: 1pt solid #e0e0e0 !important; padding: 5pt 10pt; color: #1a1a1a !important; vertical-align: top; }
tbody tr:nth-child(even) td { background: #fafafa !important; }
tr { background: transparent !important; }

/* ── KaTeX math ── */
.katex-display { background: #f8f5ff !important; border: 1pt solid #e0d5ff !important; border-radius: 4pt; padding: 10pt 12pt; margin: 12pt 0; overflow: hidden; page-break-inside: avoid; text-align: center; }
.katex-display > .katex { color: #4c1d95 !important; }
.katex { color: #3b1fa8; }

/* ── Mermaid diagrams ── */
.mermaid-wrapper { background: #f8f8ff !important; border: 1pt solid #ddd !important; border-radius: 6pt; padding: 14pt 8pt; margin: 14pt 0; page-break-inside: avoid; display: flex !important; justify-content: center; align-items: center; }
.mermaid-wrapper > div { display: flex !important; justify-content: center; width: 100%; }
.mermaid-wrapper svg { max-width: 100% !important; height: auto !important; }

/* ── Images ── */
figure { margin: 12pt 0; page-break-inside: avoid; }
img { max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4pt; }
figcaption { text-align: center; font-size: 8.5pt; color: #888; margin-top: 4pt; font-style: italic; font-family: system-ui, sans-serif; }

/* ── Eval section ── */
.eval-card { border: 1pt solid #e0e0e0 !important; border-radius: 6pt; padding: 12pt 16pt; margin: 16pt 0; page-break-inside: avoid; background: #fafafa !important; }
.eval-card > div { border: none !important; background: transparent !important; }
/* Score colors */
.text-emerald-400 { color: #059669 !important; }
.text-blue-400    { color: #2563eb !important; }
.text-amber-400   { color: #d97706 !important; }
.text-red-400     { color: #dc2626 !important; }
/* Score bar track */
[class*="h-1"] { height: 5pt !important; border-radius: 99pt !important; margin: 4pt 0 !important; overflow: hidden; }
.bg-slate-700, [class*="bg-slate-7"] { background-color: #e0e0e0 !important; }
/* Score bar fill (width is set via inline style) */
.bg-emerald-500 { background-color: #10b981 !important; }
.bg-blue-500    { background-color: #3b82f6 !important; }
.bg-amber-500   { background-color: #f59e0b !important; }
.bg-red-500     { background-color: #ef4444 !important; }
/* Grid for dimensions */
.grid { display: grid !important; }
.sm\\:grid-cols-2 { grid-template-columns: 1fr 1fr !important; }
[class*="divide-y"] > * + * { border-top: none !important; }
[class*="divide-"] { border: none !important; }
/* Text sizes */
.text-xs { font-size: 8.5pt !important; }
.text-sm { font-size: 9.5pt !important; }
.text-2xl { font-size: 18pt !important; font-weight: 700 !important; }

/* ── Sources ── */
.sources-section { margin-top: 16pt; padding-top: 12pt; border-top: 1pt solid #e0e0e0 !important; }
.sources-section > .flex { display: none !important; }
.sources-section::before { content: 'SOURCES'; display: block; font-family: system-ui, sans-serif; font-size: 8pt; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 8pt; }
.source-card-grid { display: block !important; }
.source-card-item { display: flex !important; align-items: flex-start; gap: 8pt; background: #fafafa !important; border: 1pt solid #e0e0e0 !important; border-radius: 4pt; padding: 7pt 10pt; margin: 5pt 0; page-break-inside: avoid; color: #1a1a1a !important; text-decoration: none; }
.source-card-item > span:first-child { flex-shrink: 0; width: 18pt; height: 18pt; min-width: 18pt; border-radius: 3pt; background: #f0ecff !important; color: #5b21b6 !important; font-size: 8pt; font-weight: 700; font-family: system-ui, sans-serif; display: flex !important; align-items: center; justify-content: center; margin-top: 1pt; }
.source-card-item > div { flex: 1; min-width: 0; overflow: hidden; }
.source-card-item > span:last-child { display: none !important; }
.source-card-item p { margin: 0 !important; font-size: 9.5pt; color: #1a1a1a !important; line-height: 1.4; }
.source-url     { color: #5b21b6 !important; font-size: 8pt !important; display: block !important; margin-top: 1pt !important; }
.source-snippet { color: #666    !important; font-size: 8pt !important; display: block !important; margin-top: 2pt !important; }

/* ── Hide UI chrome ── */
.no-print, button, .print-header, [class*="animate-"] { display: none !important; }

/* ── Page breaks ── */
h2, h3 { page-break-after: avoid; }
table, figure, .mermaid-wrapper, .katex-display, .eval-card, .source-card-item { page-break-inside: avoid; }
</style>
</head>
<body>
<div class="doc-header">
  <div class="doc-label">Research Report</div>
  <h1>${esc(topic)}</h1>
  <p class="doc-meta">Generated by AI Research Agent &middot; ${date}</p>
</div>
${bodyHTML}
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────
// Print via hidden iframe — never blocked by popup blockers,
// never touches the dark-mode main page.
// ─────────────────────────────────────────────────────────────
function printViaIframe(html) {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:0;opacity:0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  const doPrint = () => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (_) {}
    // Remove iframe after print dialog closes (generous delay)
    setTimeout(() => { if (document.body.contains(iframe)) iframe.remove() }, 10000)
  }

  // Wait for KaTeX CDN stylesheet to load before printing
  const link = doc.querySelector('link[rel="stylesheet"]')
  if (link) {
    let fired = false
    const fire = () => { if (!fired) { fired = true; doPrint() } }
    link.addEventListener('load', fire)
    link.addEventListener('error', fire)
    setTimeout(fire, 3000) // hard fallback
  } else {
    setTimeout(doPrint, 300)
  }
}

// ── Source card ─────────────────────────────────────────────
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

// ── Markdown components ──────────────────────────────────────
const mdComponents = {
  a:  ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all">{children}</a>,
  p:  ({ children }) => <p className="break-words overflow-hidden leading-relaxed my-3 text-slate-300">{children}</p>,
  img: ({ src, alt }) => (
    <figure className="my-6">
      <img src={src} alt={alt} className="rounded-xl border border-slate-700/60 max-w-full h-auto mx-auto block shadow-lg" onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
      {alt && <figcaption className="text-center text-xs text-slate-500 mt-2 italic">{alt}</figcaption>}
    </figure>
  ),
  code: ({ className, children }) => {
    const lang = /language-(\w+)/.exec(className || '')?.[1]
    const raw = String(children)
    if (lang === 'mermaid') return <div className="mermaid-wrapper"><MermaidChart code={raw.trim()} /></div>
    if (!raw.includes('\n') && !lang) return <code className="bg-slate-800 text-violet-300 px-1.5 py-0.5 rounded text-[0.85em] font-mono">{children}</code>
    return <pre className="my-4 rounded-xl bg-slate-900 border border-slate-700/60 p-4 overflow-x-auto"><code className={`text-slate-300 text-sm font-mono ${className || ''}`}>{children}</code></pre>
  },
  table:  ({ children }) => <div className="my-5 overflow-x-auto rounded-xl border border-slate-700/60"><table className="w-full text-sm border-collapse">{children}</table></div>,
  thead:  ({ children }) => <thead className="bg-slate-800/80">{children}</thead>,
  tbody:  ({ children }) => <tbody className="divide-y divide-slate-700/40">{children}</tbody>,
  tr:     ({ children }) => <tr className="hover:bg-slate-800/40 transition-colors">{children}</tr>,
  th:     ({ children }) => <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{children}</th>,
  td:     ({ children }) => <td className="px-4 py-3 text-slate-300 align-top">{children}</td>,
  blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-violet-600 pl-4 text-slate-400 italic bg-violet-950/10 py-2 pr-4 rounded-r-lg">{children}</blockquote>,
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

// ── Report component ─────────────────────────────────────────
export default function Report({ sessionId, topic, content, sources, onReset }) {

  const handlePrint = () => {
    const el = document.getElementById('report-printable')
    if (!el) return

    const clone = el.cloneNode(true)
    clone.querySelectorAll('.no-print, button').forEach(e => e.remove())

    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    })

    printViaIframe(buildPrintHTML(topic, clone.innerHTML, date))
  }

  return (
    <div className="w-full space-y-6 overflow-hidden">

      {/* Screen header — stripped in print */}
      <div className="no-print flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Research Report</p>
          <h2 className="text-xl font-bold text-slate-100 leading-snug break-words">{topic}</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2 transition-all"
            title="Generates a clean white PDF with all diagrams and math">
            <span className="text-base leading-none">↓</span> Save as PDF
          </button>
          <button onClick={onReset}
            className="rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 transition-colors">
            + New Research
          </button>
        </div>
      </div>

      <p className="no-print text-xs text-slate-600 -mt-4">
        Generates a clean white PDF preview — select <em>Save as PDF</em> in the print dialog.
      </p>

      {/* Printable content — cloned for iframe */}
      <div id="report-printable" className="space-y-6">

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

        <div className="eval-card">
          <EvalScore sessionId={sessionId} />
        </div>

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
