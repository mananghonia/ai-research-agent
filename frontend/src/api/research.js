import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const startResearch = (topic) =>
  api.post('/research/start/', { topic }).then((r) => r.data)

export const getReport = (sessionId) =>
  api.get(`/research/${sessionId}/report/`).then((r) => r.data)

export const getHistory = () =>
  api.get('/history/').then((r) => r.data.sessions)

export const getPdfUrl = (sessionId) => `/api/research/${sessionId}/pdf/`

export const createEventSource = (sessionId) =>
  new EventSource(`/api/research/${sessionId}/stream/`)
