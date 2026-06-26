import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  // 'base' theme respects all themeVariables — 'dark' overrides some of them
  theme: 'base',
  themeVariables: {
    darkMode: true,
    background: '#0f172a',
    primaryColor: '#312e81',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#4338ca',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    lineColor: '#64748b',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: '13px',
    titleColor: '#f1f5f9',
    textColor: '#cbd5e1',
    labelColor: '#94a3b8',
    labelTextColor: '#e2e8f0',

    // ── Quadrant chart — 4 distinct quadrant colors ──
    quadrant1Fill: '#1e3a5f',      // top-right: blue
    quadrant2Fill: '#1a3528',      // top-left:  green
    quadrant3Fill: '#3b1f1f',      // bottom-left: red
    quadrant4Fill: '#3b2f19',      // bottom-right: amber
    quadrant1TextFill: '#93c5fd',
    quadrant2TextFill: '#86efac',
    quadrant3TextFill: '#fca5a5',
    quadrant4TextFill: '#fde68a',
    quadrantPointFill: '#c4b5fd',
    quadrantPointTextFill: '#f1f5f9',
    quadrantXAxisTextFill: '#94a3b8',
    quadrantYAxisTextFill: '#94a3b8',
    quadrantInternalBorderStrokeFill: '#334155',
    quadrantExternalBorderStrokeFill: '#475569',
    quadrantTitleFill: '#f1f5f9',

    // ── Timeline / gantt section colors ──
    cScale0: '#5b21b6',
    cScale1: '#1d4ed8',
    cScale2: '#0e7490',
    cScale3: '#15803d',
    cScale4: '#b45309',
    cScale5: '#b91c1c',
    cScale6: '#7e22ce',
    cScale7: '#1e40af',
    cScale8: '#155e75',
    // Label text on those sections
    cScaleLabel0: '#ffffff',
    cScaleLabel1: '#ffffff',
    cScaleLabel2: '#ffffff',
    cScaleLabel3: '#ffffff',
    cScaleLabel4: '#ffffff',
    cScaleLabel5: '#ffffff',
    cScaleLabel6: '#ffffff',
    cScaleLabel7: '#ffffff',
    cScaleLabel8: '#ffffff',
    cScalePeer0: '#7c3aed',
    cScalePeer1: '#2563eb',
    cScalePeer2: '#0891b2',

    // ── Pie chart ──
    pie1: '#7c3aed',
    pie2: '#2563eb',
    pie3: '#0891b2',
    pie4: '#059669',
    pie5: '#d97706',
    pie6: '#dc2626',
    pie7: '#9333ea',
    pieTitleTextSize: '18px',
    pieTitleTextColor: '#f1f5f9',
    pieSectionTextColor: '#ffffff',
    pieSectionTextSize: '13px',
    pieLegendTextColor: '#94a3b8',
    pieLegendTextSize: '13px',

    // ── Flowchart nodes ──
    nodeBkg: '#1e293b',
    nodeTextColor: '#e2e8f0',
    nodeBorder: '#4338ca',
    clusterBkg: '#0f172a',
    clusterBorder: '#334155',
    edgeLabelBackground: '#1e293b',
    mainBkg: '#1e293b',
    altBackground: '#0f172a',

    // ── xychart (bar/line) ──
    xyChart: {
      backgroundColor: '#0f172a',
      plotColorPalette: '#7c3aed,#2563eb,#0891b2,#059669,#d97706',
    },
  },
  flowchart: { curve: 'basis', useMaxWidth: true, htmlLabels: true },
  pie: { useWidth: 560, useMaxWidth: true },
  quadrantChart: { useMaxWidth: true },
  xychart: { useMaxWidth: true },
})

let idCounter = 0

export default function MermaidChart({ code }) {
  const ref = useRef(null)
  const [error, setError] = useState(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    if (!ref.current || !code) return

    const id = `mermaid-${++idCounter}`
    setError(null)
    setRendered(false)

    mermaid.render(id, code)
      .then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg
          const svgEl = ref.current.querySelector('svg')
          if (svgEl) {
            svgEl.style.maxWidth = '100%'
            svgEl.style.height = 'auto'
            svgEl.style.background = 'transparent'
          }
          setRendered(true)
        }
      })
      .catch(() => {
        setError(true)
      })
  }, [code])

  if (error) {
    // Parse first line to show diagram type
    const firstLine = code.split('\n')[0].trim()
    return (
      <div className="my-4 rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-slate-500 text-xs uppercase tracking-wider font-medium">
            Diagram — {firstLine}
          </span>
          <span className="text-xs text-amber-500/80 bg-amber-950/30 px-2 py-0.5 rounded-full">
            Could not render
          </span>
        </div>
        <pre className="text-slate-500 text-xs whitespace-pre-wrap leading-relaxed font-mono">
          {code}
        </pre>
      </div>
    )
  }

  return (
    <div className={`my-6 rounded-xl border border-slate-700/60 bg-slate-900/80 p-5 overflow-x-auto transition-opacity ${rendered ? 'opacity-100' : 'opacity-0'}`}>
      <div ref={ref} className="flex justify-center min-h-[60px]" />
    </div>
  )
}
