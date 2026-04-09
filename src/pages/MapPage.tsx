import { useMemo, useState } from 'react'
import { usePositions } from '../hooks/usePositions'
import { useAllEventOverlay } from '../hooks/useEvents'
import { OrchardMap } from '../components/map/OrchardMap'
import {
  buildEventSet,
  getOverlayColor,
  isActionableTree,
  OVERLAY_LABELS,
  SEASON_LABELS,
  OVERLAY_DONE_LABELS,
} from '../lib/eventOverlay'
import type { OverlayMode, SeasonFilter } from '../lib/eventOverlay'
import { QUARTERS } from '../lib/constants'

const OVERLAY_MODES: OverlayMode[] = ['condition', 'pruning', 'fertilization']
const SEASON_FILTERS: SeasonFilter[] = ['current', 'previous', 'all']

export function MapPage() {
  const { data: positions, isLoading, error } = usePositions()
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('condition')
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>('current')

  const eventType = overlayMode !== 'condition' ? overlayMode : undefined
  const { data: overlayEvents } = useAllEventOverlay(eventType)

  const eventSet = useMemo(
    () => (overlayEvents ? buildEventSet(overlayEvents, seasonFilter) : new Set<string>()),
    [overlayEvents, seasonFilter]
  )

  const isOverlay = overlayMode !== 'condition'

  const overlayColorFn = useMemo(() => {
    if (!isOverlay) return undefined
    return (p) => getOverlayColor(p, overlayMode, eventSet)
  }, [isOverlay, overlayMode, eventSet])

  const quarterStats = useMemo(() => {
    if (!isOverlay || !positions) return []
    return QUARTERS.map((q) => {
      const trees = positions.filter((p) => p.quarterId === q.id && isActionableTree(p))
      const done = trees.filter((p) => eventSet.has(p.id)).length
      const total = trees.length
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      return { ...q, done, total, pct }
    })
  }, [isOverlay, positions, eventSet])

  const doneLabel =
    overlayMode === 'pruning' || overlayMode === 'fertilization'
      ? OVERLAY_DONE_LABELS[overlayMode]
      : ''

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-stone-800 mb-3">Karta</h1>

      {/* Overlay toggle */}
      <div className="flex gap-2 mb-2">
        {OVERLAY_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setOverlayMode(mode)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              overlayMode === mode
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-600 active:bg-stone-200'
            }`}
          >
            {OVERLAY_LABELS[mode]}
          </button>
        ))}
      </div>

      {/* Season filter */}
      {isOverlay && (
        <div className="flex gap-3 mb-3">
          {SEASON_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSeasonFilter(f)}
              className={`text-xs px-2 py-1 border-b-2 transition-colors ${
                seasonFilter === f
                  ? 'border-stone-800 font-medium text-stone-800'
                  : 'border-transparent text-stone-500'
              }`}
            >
              {SEASON_LABELS[f]}
            </button>
          ))}
        </div>
      )}

      {/* Per-quarter progress */}
      {isOverlay && quarterStats.length > 0 && (
        <div className="mb-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {quarterStats.map((q) => {
            const complete = q.total > 0 && q.done === q.total
            return (
              <div key={q.id} className="bg-stone-50 rounded-xl px-3 py-2 border border-stone-200">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: complete ? '#15803d' : '#44403c' }}>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: q.color }}
                    />
                    {q.name}
                  </span>
                  <span className="text-xs" style={{ color: complete ? '#15803d' : '#78716c' }}>
                    {q.done}/{q.total}
                  </span>
                </div>
                <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${q.pct}%`, background: complete ? '#15803d' : '#f59e0b' }}
                  />
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  {q.pct}% {doneLabel}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isLoading && <div className="text-center py-12 text-stone-400">Laddar karta...</div>}
      {error && <div className="text-center py-12 text-red-500">Kunde inte ladda data</div>}
      {positions && <OrchardMap positions={positions} overlayColorFn={overlayColorFn} />}
    </div>
  )
}
