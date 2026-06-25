import { useState } from 'react'

export default function ResearchForm({ onSubmit, isLoading, topic: activeTopic }) {
  const [topic, setTopic] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = topic.trim()
    if (!trimmed || isLoading) return
    onSubmit(trimmed)
    setTopic('')
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-violet-800/50 bg-violet-950/20 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <div className="min-w-0">
            <p className="text-violet-300 text-sm font-medium">Researching your topic...</p>
            <p className="text-slate-500 text-xs truncate mt-0.5">{activeTopic}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder='e.g. "Future of quantum computing" or "Impact of AI on healthcare"'
        rows={3}
        autoFocus
        className="w-full rounded-xl border border-slate-700 hover:border-slate-600 focus:border-violet-500 bg-slate-800/60 px-4 py-3.5 text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-colors text-sm leading-relaxed"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e)
        }}
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!topic.trim()}
          className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 transition-colors text-sm shadow-lg shadow-violet-900/30"
        >
          Start Research
        </button>
        <span className="text-slate-600 text-xs whitespace-nowrap">Ctrl+Enter</span>
      </div>
    </form>
  )
}
