import type { Event, Position } from './types'
import type { OverlayColor } from '../components/map/PositionDot'

export type SeasonFilter = 'current' | 'previous' | 'all'
export type OverlayMode = 'condition' | 'pruning' | 'fertilization'

const OVERLAY_DONE: OverlayColor = { bg: '#22c55e', border: '#15803d' }
const OVERLAY_MISSING: OverlayColor = { bg: '#fca5a5', border: '#dc2626' }

/** A living tree that can receive events (pruning, fertilization, etc.) */
export function isActionableTree(p: Position): boolean {
  return p.type === 'tree' && p.condition !== 'dead'
}

export function getOverlayColor(
  position: Position,
  overlayMode: OverlayMode,
  eventSet: Set<string>
): OverlayColor | null {
  if (overlayMode === 'condition') return null
  if (!isActionableTree(position)) return null
  return eventSet.has(position.id) ? OVERLAY_DONE : OVERLAY_MISSING
}

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
