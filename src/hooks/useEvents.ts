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

export function useEventOverlay(
  quarterId: string | undefined,
  eventType: 'pruning' | 'fertilization' | undefined
) {
  return useQuery({
    queryKey: ['events', { quarterId, type: eventType }],
    queryFn: () => api.getEvents({ quarterId, type: eventType }),
    enabled: !!quarterId && !!eventType,
    staleTime: 60_000,
  })
}

export function useAllEventOverlay(
  eventType: 'pruning' | 'fertilization' | undefined
) {
  return useQuery({
    queryKey: ['events', { type: eventType }],
    queryFn: () => api.getEvents({ type: eventType }),
    enabled: !!eventType,
    staleTime: 60_000,
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEventPayload) => api.createEvent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useCreateBatchEvents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BatchEventPayload) => api.createBatchEvents(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
