import { useEffect, useRef, useState, useMemo } from 'react'
import type { Position } from '../../lib/types'
import { PositionDot } from '../map/PositionDot'
import type { OverlayColor } from '../map/PositionDot'
import type { OverlayMode } from '../../lib/eventOverlay'

interface RowData {
  label: string
  positions: Position[]
}

interface Props {
  positions: Position[]
  quarterId: string
  selected: Set<string>
  onChange: (selected: Set<string>) => void
  overlayMode?: OverlayMode
  eventSet?: Set<string>
}

function groupIntoRows(positions: Position[]): RowData[] {
  const map = new Map<string, Position[]>()
  for (const p of positions) {
    const arr = map.get(p.row) || []
    arr.push(p)
    map.set(p.row, arr)
  }
  const rows: RowData[] = []
  for (const [label, pos] of map) {
    pos.sort((a, b) => a.position - b.position)
    rows.push({ label, positions: pos })
  }
  rows.sort((a, b) => {
    const aNum = parseInt(a.label.replace(/\D/g, ''))
    const bNum = parseInt(b.label.replace(/\D/g, ''))
    if (a.label.startsWith('P') && !b.label.startsWith('P')) return 1
    if (!a.label.startsWith('P') && b.label.startsWith('P')) return -1
    return aNum - bNum
  })
  return rows
}

function isSelectable(p: Position) {
  return p.type === 'tree'
}

const OVERLAY_DONE: OverlayColor = { bg: '#22c55e', border: '#15803d' }
const OVERLAY_MISSING: OverlayColor = { bg: '#fca5a5', border: '#dc2626' }

function getOverlayColor(
  position: Position,
  overlayMode: OverlayMode,
  eventSet: Set<string>
): OverlayColor | null {
  if (overlayMode === 'condition') return null
  if (position.type !== 'tree') return null
  return eventSet.has(position.id) ? OVERLAY_DONE : OVERLAY_MISSING
}

export function MaintenanceQuarterMap({
  positions,
  quarterId,
  selected,
  onChange,
  overlayMode = 'condition',
  eventSet,
}: Props) {
  const [zoom, setZoom] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef(selected)
  useEffect(() => { selectionRef.current = selected }, [selected])

  const isDragging = useRef(false)
  const dragMode = useRef<'add' | 'remove'>('add')

  const cs = Math.round(14 * zoom)
  const g = Math.max(1, Math.round(2 * zoom))

  const effectiveEventSet = eventSet ?? new Set<string>()
  const isOverlay = overlayMode !== 'condition'

  const { mainRows, pumpRows } = useMemo(() => {
    if (quarterId === 'gravensteiner') {
      const main = positions.filter((p) => !p.row.startsWith('P'))
      const pump = positions.filter((p) => p.row.startsWith('P'))
      return { mainRows: groupIntoRows(main), pumpRows: groupIntoRows(pump) }
    }
    return { mainRows: groupIntoRows(positions), pumpRows: [] }
  }, [positions, quarterId])

  const treesTotal = positions.filter(isSelectable).length
  const treesSelected = positions.filter((p) => isSelectable(p) && selected.has(p.id)).length
  const allSelected = treesTotal > 0 && treesSelected === treesTotal

  function toggleAll() {
    if (allSelected) {
      onChange(new Set())
    } else {
      onChange(new Set(positions.filter(isSelectable).map((p) => p.id)))
    }
  }

  function toggleRow(row: RowData) {
    const treeIds = row.positions.filter(isSelectable).map((p) => p.id)
    const allRowSelected = treeIds.every((id) => selected.has(id))
    const next = new Set(selected)
    if (allRowSelected) {
      treeIds.forEach((id) => next.delete(id))
    } else {
      treeIds.forEach((id) => next.add(id))
    }
    onChange(next)
  }

  function getPositionId(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y)
    return el?.closest<HTMLElement>('[data-position-id]')?.dataset.positionId ?? null
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function handleTouchStart(e: TouchEvent) {
      const touch = e.touches[0]
      const id = getPositionId(touch.clientX, touch.clientY)
      if (!id) return // no dot under finger → allow normal scroll

      const pos = positions.find((p) => p.id === id)
      if (!pos || !isSelectable(pos)) return

      e.preventDefault()
      isDragging.current = true
      const next = new Set(selectionRef.current)
      if (next.has(id)) {
        next.delete(id)
        dragMode.current = 'remove'
      } else {
        next.add(id)
        dragMode.current = 'add'
      }
      onChange(next)
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isDragging.current) return
      e.preventDefault()
      const touch = e.touches[0]
      const id = getPositionId(touch.clientX, touch.clientY)
      if (!id) return
      const pos = positions.find((p) => p.id === id)
      if (!pos || !isSelectable(pos)) return

      const next = new Set(selectionRef.current)
      if (dragMode.current === 'add') {
        if (next.has(id)) return
        next.add(id)
      } else {
        if (!next.has(id)) return
        next.delete(id)
      }
      onChange(next)
    }

    function handleTouchEnd() {
      isDragging.current = false
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [positions, onChange])

  // Mouse fallback
  function handleMouseDown(e: React.MouseEvent) {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-position-id]')?.dataset.positionId
    if (!id) return
    const pos = positions.find((p) => p.id === id)
    if (!pos || !isSelectable(pos)) return
    isDragging.current = true
    const next = new Set(selectionRef.current)
    if (next.has(id)) { next.delete(id); dragMode.current = 'remove' }
    else { next.add(id); dragMode.current = 'add' }
    onChange(next)
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging.current || e.buttons !== 1) return
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-position-id]')?.dataset.positionId
    if (!id) return
    const pos = positions.find((p) => p.id === id)
    if (!pos || !isSelectable(pos)) return
    const next = new Set(selectionRef.current)
    if (dragMode.current === 'add') { if (next.has(id)) return; next.add(id) }
    else { if (!next.has(id)) return; next.delete(id) }
    onChange(next)
  }

  function handleMouseUp() { isDragging.current = false }

  function renderColumn(row: RowData) {
    const treeIds = row.positions.filter(isSelectable).map((p) => p.id)
    const rowAllSelected = treeIds.length > 0 && treeIds.every((id) => selected.has(id))
    return (
      <div key={row.label} className="flex flex-col items-center" style={{ gap: g }}>
        <button
          type="button"
          onClick={() => toggleRow(row)}
          className="select-none"
          style={{
            fontSize: 9,
            fontFamily: 'monospace',
            color: rowAllSelected ? '#d97706' : '#a8a29e',
            fontWeight: rowAllSelected ? 700 : 400,
          }}
        >
          {row.label}
        </button>
        {row.positions.map((p) => {
          const showNumber = p.position === 1 || p.position % 10 === 0
          const overlayColor = getOverlayColor(p, overlayMode, effectiveEventSet)
          return (
            <div
              key={p.id}
              data-position-id={p.id}
              style={{
                position: 'relative',
                borderRadius: '50%',
                boxShadow: selected.has(p.id) ? '0 0 0 2px #f59e0b, 0 0 0 3px #fff, 0 0 0 5px #f59e0b' : undefined,
              }}
            >
              <PositionDot
                position={p}
                size={cs}
                overlayColor={overlayColor}
              />
              {showNumber && (
                <span
                  className="absolute text-stone-300 select-none pointer-events-none"
                  style={{
                    fontSize: 8,
                    fontFamily: 'monospace',
                    left: cs + 2,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    lineHeight: 1,
                  }}
                >
                  {p.position}
                </span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const rowSummaries = useMemo(() => {
    if (!isOverlay) return []
    const allRows = [...mainRows, ...pumpRows]
    return allRows.map((r) => {
      const trees = r.positions.filter(isSelectable)
      const done = trees.filter((p) => effectiveEventSet.has(p.id)).length
      return {
        label: r.label,
        done,
        total: trees.length,
        pct: trees.length > 0 ? Math.round((done / trees.length) * 100) : 0,
      }
    })
  }, [isOverlay, mainRows, pumpRows, effectiveEventSet])

  return (
    <div>
      {/* Header: count + zoom + select-all */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="text-sm text-stone-500 shrink-0">
          {treesSelected > 0 ? `${treesSelected} av ${treesTotal} valda` : `${treesTotal} träd`}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 shrink-0">Zoom</span>
          <input
            type="range"
            min={75}
            max={250}
            value={Math.round(zoom * 100)}
            onChange={(e) => setZoom(+e.target.value / 100)}
            className="w-20"
          />
        </div>
        {treesTotal > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-sm font-medium text-amber-700 active:text-amber-900 shrink-0"
          >
            {allSelected ? 'Avmarkera alla' : 'Markera alla'}
          </button>
        )}
      </div>

      {/* Map */}
      <div
        ref={containerRef}
        className="overflow-auto bg-stone-50 border border-stone-200 rounded-xl p-3"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex" style={{ gap: g * 4 }}>
          {/* Main rows */}
          <div className="flex" style={{ gap: g }}>
            {mainRows.map(renderColumn)}
          </div>
          {/* Pump rows (Gravensteiner only) */}
          {pumpRows.length > 0 && (
            <div className="flex" style={{ gap: g }}>
              {pumpRows.map(renderColumn)}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-stone-400 mt-1.5">
        Tryck på radetikett för att markera hela raden · Dra för att markera flera
      </p>

      {/* Row summary grid */}
      {isOverlay && rowSummaries.length > 0 && (
        <div
          className="mt-3 grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}
        >
          {rowSummaries.map((r) => {
            const complete = r.total > 0 && r.done === r.total
            return (
              <div
                key={r.label}
                className="bg-stone-50 rounded-xl px-3 py-2 border border-stone-200"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span
                    className="text-sm font-mono font-medium"
                    style={{ color: complete ? '#15803d' : undefined }}
                  >
                    {r.label}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: complete ? '#15803d' : '#78716c' }}
                  >
                    {r.done}/{r.total}
                  </span>
                </div>
                <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${r.pct}%`,
                      background: complete ? '#15803d' : '#f59e0b',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
