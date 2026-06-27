import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
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

    // Quadrant chart — 4 distinct colors
    quadrant1Fill: '#1e3a5f',
    quadrant2Fill: '#1a3528',
    quadrant3Fill: '#3b1f1f',
    quadrant4Fill: '#3b2f19',
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

    // Timeline section colors
    cScale0: '#5b21b6',
    cScale1: '#1d4ed8',
    cScale2: '#0e7490',
    cScale3: '#15803d',
    cScale4: '#b45309',
    cScale5: '#b91c1c',
    cScale6: '#7e22ce',
    cScale7: '#1e40af',
    cScale8: '#155e75',
    cScaleLabel0: '#ffffff',
    cScaleLabel1: '#ffffff',
    cScaleLabel2: '#ffffff',
    cScaleLabel3: '#ffffff',
    cScaleLabel4: '#ffffff',
    cScaleLabel5: '#ffffff',
    cScaleLabel6: '#ffffff',
    cScaleLabel7: '#ffffff',
    cScaleLabel8: '#ffffff',

    // Pie chart
    pie1: '#7c3aed', pie2: '#2563eb', pie3: '#0891b2',
    pie4: '#059669', pie5: '#d97706', pie6: '#dc2626', pie7: '#9333ea',
    pieTitleTextSize: '18px',
    pieTitleTextColor: '#f1f5f9',
    pieSectionTextColor: '#ffffff',
    pieSectionTextSize: '13px',
    pieLegendTextColor: '#94a3b8',

    // Flowchart
    nodeBkg: '#1e293b',
    nodeTextColor: '#e2e8f0',
    nodeBorder: '#4338ca',
    clusterBkg: '#0f172a',
    clusterBorder: '#334155',
    edgeLabelBackground: '#1e293b',
    mainBkg: '#1e293b',

    // xychart — nested object for color overrides
    xyChart: {
      backgroundColor: '#0f172a',
      plotColorPalette: '#7c3aed,#2563eb,#0891b2,#059669,#d97706,#dc2626,#9333ea',
    },
  },
  flowchart: { curve: 'basis', useMaxWidth: true, htmlLabels: true },
  pie: { useWidth: 560, useMaxWidth: true },
  quadrantChart: { useMaxWidth: true },
  xychart: { useMaxWidth: true, width: 900, height: 450 },
})

// Postprocess xychart SVG — mermaid's theme variables don't reliably
// apply text colors for xychart, so we fix them directly in the SVG.
function fixXyChartColors(svgEl) {
  // All text → visible light color
  svgEl.querySelectorAll('text').forEach(el => {
    el.setAttribute('fill', '#e2e8f0')
    el.style.fill = '#e2e8f0'
  })

  // Axis lines and ticks → slate
  svgEl.querySelectorAll('line, path.domain').forEach(el => {
    const stroke = el.getAttribute('stroke')
    if (stroke && stroke !== 'none' && stroke !== 'transparent') {
      el.setAttribute('stroke', '#475569')
    }
  })

  // Grid lines → more subtle
  svgEl.querySelectorAll('.tick line').forEach(el => {
    el.setAttribute('stroke', '#1e293b')
  })

  // Bars — keep violet but add a subtle stroke
  svgEl.querySelectorAll('rect:not([class*="background"])').forEach(el => {
    const fill = el.getAttribute('fill')
    if (fill && fill !== 'none' && fill !== '#0f172a' && fill !== 'transparent') {
      el.setAttribute('rx', '4')
      el.setAttribute('ry', '4')
    }
  })
}

// Claude sometimes omits the diagram-type keyword on the first line
// (e.g. starts with "title ..." instead of "quadrantChart\ntitle ...").
// mermaid.render() fails silently in that case. This function detects
// the diagram type from content and prepends the keyword when missing.
function normalizeMermaidCode(raw) {
  const code = raw.trim()
  const firstLine = code.split('\n')[0].toLowerCase().trim()

  const knownTypes = [
    'flowchart', 'graph ', 'sequencediagram', 'timeline', 'pie',
    'xychart', 'quadrantchart', 'mindmap', 'gantt', 'classdiagram',
    'statediagram', 'erdiagram', 'gitgraph', 'block-beta', 'sankey',
  ]
  if (knownTypes.some(t => firstLine.startsWith(t))) return code

  // Detect from body keywords
  if (/\bquadrant-[1-4]\b/.test(code)) return 'quadrantChart\n' + code
  if (/^\s*\d{4}\s*:/m.test(code) && firstLine.startsWith('title')) return 'timeline\n' + code
  if (/^xychart/i.test(code)) return code

  return code
}

let idCounter = 0

export default function MermaidChart({ code }) {
  const ref = useRef(null)
  const [error, setError] = useState(null)
  const [rendered, setRendered] = useState(false)

  const normalized = normalizeMermaidCode(code)
  const diagramType = normalized.split('\n')[0].trim().toLowerCase()
  const isXyChart = diagramType.startsWith('xychart')

  useEffect(() => {
    if (!ref.current || !normalized) return

    const id = `mermaid-${++idCounter}`
    setError(null)
    setRendered(false)

    mermaid.render(id, normalized)
      .then(({ svg }) => {
        if (!ref.current) return
        ref.current.innerHTML = svg
        const svgEl = ref.current.querySelector('svg')
        if (svgEl) {
          svgEl.style.maxWidth = '100%'
          svgEl.style.height = 'auto'
          svgEl.style.background = 'transparent'
          if (isXyChart) fixXyChartColors(svgEl)
        }
        setRendered(true)
      })
      .catch(() => setError(true))
  }, [normalized])

  if (error) {
    const firstLine = normalized.split('\n')[0].trim()
    return (
      <div className="mermaid-wrapper my-4 rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-slate-500 text-xs uppercase tracking-wider font-medium">
            Diagram — {firstLine}
          </span>
          <span className="text-xs text-amber-500/80 bg-amber-950/30 px-2 py-0.5 rounded-full">
            Could not render
          </span>
        </div>
        <pre className="text-slate-400 text-xs whitespace-pre-wrap leading-relaxed font-mono">
          {normalized}
        </pre>
      </div>
    )
  }

  return (
    <div
      className={`mermaid-wrapper my-6 rounded-xl border border-slate-700/60 bg-slate-900/80 overflow-x-auto transition-opacity duration-300 ${rendered ? 'opacity-100' : 'opacity-0'}`}
      style={{ padding: isXyChart ? '1.25rem 0.5rem 0.75rem' : '1.25rem' }}
    >
      <div ref={ref} className="flex justify-center min-h-[60px]" />
    </div>
  )
}
