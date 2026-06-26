import { useEffect, useState } from 'react'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

const DIMENSIONS = [
  { key: 'accuracy',       label: 'Accuracy',       icon: '🎯' },
  { key: 'completeness',   label: 'Completeness',   icon: '📋' },
  { key: 'clarity',        label: 'Clarity',        icon: '✍️' },
  { key: 'source_quality', label: 'Source Quality', icon: '🔗' },
]

function scoreColor(score) {
  if (score >= 8) return 'text-emerald-400'
  if (score >= 6) return 'text-blue-400'
  if (score >= 4) return 'text-amber-400'
  return 'text-red-400'
}

function scoreBarColor(score) {
  if (score >= 8) return 'bg-emerald-500'
  if (score >= 6) return 'bg-blue-500'
  if (score >= 4) return 'bg-amber-500'
  return 'bg-red-500'
}

function scoreLabel(score) {
  if (score >= 9) return 'Excellent'
  if (score >= 7) return 'Good'
  if (score >= 5) return 'Average'
  if (score >= 3) return 'Below Average'
  return 'Poor'
}

export default function EvalScore({ sessionId }) {
  const [eval_, setEval] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (!sessionId) return

    const fetchEval = async () => {
      try {
        const res = await axios.get(`${BASE}/api/research/${sessionId}/eval/`)
        if (res.status === 200) {
          setEval(res.data)
          setLoading(false)
          return true
        }
      } catch (err) {
        if (err.response?.status === 202) {
          return false // still pending
        }
        setLoading(false)
        return true // give up on other errors
      }
    }

    // Poll every 3 seconds until eval is ready (max 10 attempts = 30s)
    const poll = async () => {
      const done = await fetchEval()
      if (!done) {
        setAttempts(a => a + 1)
      }
    }

    poll()
    const interval = setInterval(async () => {
      if (eval_ || attempts >= 10) {
        clearInterval(interval)
        setLoading(false)
        return
      }
      const done = await fetchEval()
      if (done) clearInterval(interval)
    }, 3000)

    return () => clearInterval(interval)
  }, [sessionId])

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-5">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <div>
            <p className="text-slate-300 text-sm font-medium">Running quality evaluation...</p>
            <p className="text-slate-500 text-xs mt-0.5">Claude is scoring this report</p>
          </div>
        </div>
      </div>
    )
  }

  if (!eval_) return null

  const overall = eval_.overall

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <span className="text-slate-300 text-sm font-semibold">Report Evaluation</span>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            AI-judged
          </span>
        </div>
        {/* Overall score badge */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">{scoreLabel(overall)}</span>
          <span className={`text-2xl font-bold ${scoreColor(overall)}`}>
            {overall}
            <span className="text-sm text-slate-500 font-normal">/10</span>
          </span>
        </div>
      </div>

      {/* Dimensions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y divide-slate-700/40 sm:divide-y-0">
        {DIMENSIONS.map(({ key, label, icon }, i) => {
          const dim = eval_.dimensions[key]
          return (
            <div
              key={key}
              className={`px-5 py-4 ${i % 2 === 0 && i + 1 < DIMENSIONS.length ? 'sm:border-r border-slate-700/40' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{icon}</span>
                  <span className="text-slate-400 text-xs font-medium">{label}</span>
                </div>
                <span className={`text-sm font-bold ${scoreColor(dim.score)}`}>
                  {dim.score}/10
                </span>
              </div>
              {/* Score bar */}
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(dim.score)}`}
                  style={{ width: `${dim.score * 10}%` }}
                />
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">{dim.reason}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
