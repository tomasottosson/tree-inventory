import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Position } from '../lib/types'

export function usePositions(quarterId?: string) {
  return useQuery({
    queryKey: ['positions', quarterId ?? 'all'],
    queryFn: () => api.getPositions(quarterId),
  })
}

export function usePosition(id: string) {
  return useQuery({
    queryKey: ['position', id],
    queryFn: () => api.getPosition(id),
    enabled: !!id,
  })
}

export function useUpdatePosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Position> }) =>
      api.updatePosition(id, data),
    onSuccess: (_result, { id }) => {
      qc.invalidateQueries({ queryKey: ['positions'] })
      qc.invalidateQueries({ queryKey: ['position', id] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}
