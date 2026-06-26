import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#1e293b',
    primaryColor: '#7c3aed',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#4c1d95',
    lineColor: '#64748b',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    edgeLabelBackground: '#1e293b',
    clusterBkg: '#0f172a',
    titleColor: '#e2e8f0',
    nodeTextColor: '#e2e8f0',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  },
  flowchart: { curve: 'basis', useMaxWidth: true },
  pie: { useWidth: 600 },
})

let idCounter = 0

export default function MermaidChart({ code }) {
  const ref = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!ref.current || !code) return

    const id = `mermaid-${++idCounter}`
    setError(null)

    mermaid.render(id, code)
      .then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg
          // Make SVG responsive
          const svgEl = ref.current.querySelector('svg')
          if (svgEl) {
            svgEl.style.maxWidth = '100%'
            svgEl.style.height = 'auto'
          }
        }
      })
      .catch((err) => {
        setError('Diagram could not be rendered.')
        console.warn('Mermaid render error:', err)
      })
  }, [code])

  if (error) {
    return (
      <div className="my-4 rounded-xl border border-red-800/40 bg-red-950/20 px-4 py-3 text-red-400 text-xs">
        {error}
        <pre className="mt-2 text-slate-500 text-xs whitespace-pre-wrap">{code}</pre>
      </div>
    )
  }

  return (
    <div className="my-6 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 overflow-x-auto">
      <div ref={ref} className="flex justify-center min-h-[80px]" />
    </div>
  )
}
