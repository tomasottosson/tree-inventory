import type { Event } from './types'

export type SeasonFilter = 'current' | 'previous' | 'all'
export type OverlayMode = 'condition' | 'pruning' | 'fertilization'

export function buildEventSet(
  events: Event[],
  seasonFilter: SeasonFilter
): Set<string> {
  const now = new Date()
  const currentYear = now.getFullYear()

  const filtered = events.filter((e) => {
    if (seasonFilter === 'all') return true
    const year = parseInt(e.date.slice(0, 4))
    if (seasonFilter === 'current') return year === currentYear
    if (seasonFilter === 'previous') return year === currentYear - 1
    return true
  })

  return new Set(filtered.map((e) => e.positionId))
}

export const OVERLAY_LABELS: Record<OverlayMode, string> = {
  condition: 'Skick',
  pruning: 'Beskärning',
  fertilization: 'Gödsling',
}

export const SEASON_LABELS: Record<SeasonFilter, string> = {
  current: 'Denna säsong',
  previous: 'Förra säsongen',
  all: 'Alla',
}

export const OVERLAY_DONE_LABELS: Record<Exclude<OverlayMode, 'condition'>, string> = {
  pruning: 'beskurna',
  fertilization: 'gödslade',
}
