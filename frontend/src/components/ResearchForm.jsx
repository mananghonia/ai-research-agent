import { useState } from 'react'

export default function ResearchForm({ onSubmit, isLoading, topic: activeTopic }) {
  const [topic, setTopic] = useState('')
  const [localError, setLocalError] = useState('')

  const validate = (value) => {
    if (!value.trim()) return 'Please enter a research topic.'
    if (value.trim().length < 5) return 'Topic is too short. Please provide more detail.'
    if (value.trim().length > 500) return 'Topic must be under 500 characters.'
    return ''
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = topic.trim()
    const err = validate(trimmed)
    if (err) { setLocalError(err); return }
    if (isLoading) return
    setLocalError('')
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
      <div className="relative">
        <textarea
          value={topic}
          onChange={(e) => { setTopic(e.target.value); if (localError) setLocalError('') }}
          placeholder='e.g. "Future of quantum computing" or "Impact of AI on healthcare"'
          rows={3}
          autoFocus
          className={`w-full rounded-xl border ${localError ? 'border-red-500 focus:border-red-400' : 'border-slate-700 hover:border-slate-600 focus:border-violet-500'} bg-slate-800/60 px-4 py-3.5 text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:ring-1 ${localError ? 'focus:ring-red-500/30' : 'focus:ring-violet-500/50'} transition-colors text-sm leading-relaxed`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e)
          }}
        />
        <span className="absolute bottom-3 right-3 text-xs text-slate-600">
          {topic.length}/500
        </span>
      </div>

      {localError && (
        <p className="text-red-400 text-xs flex items-center gap-1.5">
          <span>⚠</span> {localError}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!topic.trim() || isLoading}
          className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 transition-colors text-sm shadow-lg shadow-violet-900/30"
        >
          Start Research
        </button>
        <span className="text-slate-600 text-xs whitespace-nowrap">Ctrl+Enter</span>
      </div>
    </form>
  )
}
