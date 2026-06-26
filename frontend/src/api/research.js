import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({ baseURL: `${BASE}/api` })

export const startResearch = (topic) =>
  api.post('/research/start/', { topic }).then((r) => r.data)

export const getReport = (sessionId) =>
  api.get(`/research/${sessionId}/report/`).then((r) => r.data)

export const getHistory = () =>
  api.get('/history/').then((r) => r.data.sessions)

export const getPdfUrl = (sessionId) => `${BASE}/api/research/${sessionId}/pdf/`

export const getEval = (sessionId) =>
  axios.get(`${BASE}/api/research/${sessionId}/eval/`).then((r) => r.data)

export const createEventSource = (sessionId) =>
  new EventSource(`${BASE}/api/research/${sessionId}/stream/`)
