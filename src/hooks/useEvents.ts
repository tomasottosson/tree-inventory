import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { BatchEventPayload, CreateEventPayload } from '../lib/types'

export function useEvents(params: { positionId?: string; quarterId?: string; type?: string }) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => api.getEvents(params),
    enabled: !!(params.positionId || params.quarterId),
  })
}

export function useWorkSessions(from: string, to: string) {
  return useQuery({
    queryKey: ['events', { type: 'work_session', from, to }],
    queryFn: () => api.getEvents({ type: 'work_session', from, to }),
    enabled: !!(from && to),
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEventPayload) => api.createEvent(data),
    onSuccess: (_result, data) => {
      qc.invalidateQueries({ queryKey: ['events', { positionId: data.positionId }] })
      qc.invalidateQueries({ queryKey: ['events', { quarterId: data.quarterId }] })
    },
  })
}

export function useCreateBatchEvents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BatchEventPayload) => api.createBatchEvents(data),
    onSuccess: (_result, data) => {
      qc.invalidateQueries({ queryKey: ['events', { quarterId: data.quarterId }] })
    },
  })
}
