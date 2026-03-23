const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token')
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status}: ${body}`)
  }
  return res.json()
}

export const api = {
  login: (userId: string, pin: string) =>
    request<{ user: { id: string; name: string; role: string }; token: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ userId, pin }) }
    ),

  getPositions: (quarterId?: string) =>
    request<import('./types').Position[]>(
      `/positions${quarterId ? `?quarterId=${quarterId}` : ''}`
    ),

  getPosition: (id: string) =>
    request<import('./types').Position>(`/positions/${id}`),

  updatePosition: (id: string, data: Partial<import('./types').Position>) =>
    request<import('./types').Position>(`/positions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getStats: () => request<import('./types').Stats>('/stats'),

  getEvents: (params: { positionId?: string; quarterId?: string; type?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params.positionId) qs.set('positionId', params.positionId)
    if (params.quarterId) qs.set('quarterId', params.quarterId)
    if (params.type) qs.set('type', params.type)
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    return request<import('./types').Event[]>(`/events?${qs}`)
  },

  getExportUrl: (from: string, to: string): string => {
    const base = import.meta.env.VITE_API_BASE_URL || '/api'
    return `${base}/export/work-sessions?from=${from}&to=${to}&format=csv`
  },

  createEvent: (data: import('./types').CreateEventPayload) =>
    request<import('./types').Event>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  seed: () => request<{ created: number }>('/seed', { method: 'POST' }),
}
