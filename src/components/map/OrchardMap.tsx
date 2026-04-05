import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Position } from '../../lib/types'
import { PositionDot } from './PositionDot'
import type { OverlayColor } from './PositionDot'
import { QUARTER_MAP } from '../../lib/constants'

interface RowData {
  label: string
  positions: Position[]
}

interface QuarterBlock {
  id: string
  name: string
  color: string
  bg: string
  rows: RowData[]
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

function VerticalRow({
  row,
  cellSize,
  gap,
  onClickPosition,
  overlayColorFn,
}: {
  row: RowData
  cellSize: number
  gap: number
  onClickPosition: (id: string) => void
  overlayColorFn?: (position: Position) => OverlayColor | null
}) {
  return (
    <div
      className="flex flex-col items-center"
      style={{ gap }}
    >
      <span
        className="text-stone-400 select-none"
        style={{ fontSize: 9, fontFamily: 'monospace' }}
      >
        {row.label}
      </span>
      {row.positions.map((p) => (
        <PositionDot
          key={p.id}
          position={p}
          size={cellSize}
          onClick={() => onClickPosition(p.id)}
          overlayColor={overlayColorFn ? overlayColorFn(p) : null}
        />
      ))}
    </div>
  )
}

interface OrchardMapProps {
  positions: Position[]
  overlayColorFn?: (position: Position) => OverlayColor | null
}

export function OrchardMap({ positions, overlayColorFn }: OrchardMapProps) {
  const navigate = useNavigate()
  const [zoom, setZoom] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  const quarters = useMemo(() => {
    const byQuarter = new Map<string, Position[]>()
    for (const p of positions) {
      const arr = byQuarter.get(p.quarterId) || []
      arr.push(p)
      byQuarter.set(p.quarterId, arr)
    }

    const result: Record<string, QuarterBlock> = {}
    for (const [qId, qPositions] of byQuarter) {
      const q = QUARTER_MAP[qId]
      if (!q) continue

      if (qId === 'gravensteiner') {
        const main = qPositions.filter((p) => !p.row.startsWith('P'))
        const pump = qPositions.filter((p) => p.row.startsWith('P'))
        result.gvMain = {
          id: qId,
          name: 'Gravensteiner',
          color: q.color,
          bg: q.bg,
          rows: groupIntoRows(main),
        }
        if (pump.length > 0) {
          result.gvPump = {
            id: qId,
            name: 'Pumphus-rader',
            color: q.color,
            bg: q.bg,
            rows: groupIntoRows(pump),
          }
        }
      } else {
        result[qId] = {
          id: qId,
          name: q.name,
          color: q.color,
          bg: q.bg,
          rows: groupIntoRows(qPositions),
        }
      }
    }
    return result
  }, [positions])

  const handleClick = useCallback(
    (id: string) => navigate(`/position/${id}`),
    [navigate]
  )

  // Touch zoom
  const lastDistance = useRef<number | null>(null)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (lastDistance.current !== null) {
          const scale = dist / lastDistance.current
          setZoom((z) => Math.min(3, Math.max(0.5, z * scale)))
        }
        lastDistance.current = dist
      }
    }
    function onTouchEnd() {
      lastDistance.current = null
    }

    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  const cs = Math.round(14 * zoom)
  const g = Math.max(1, Math.round(2 * zoom))
  const colW = cs + g

  // Spatial layout
  const gvMainCols = quarters.gvMain?.rows.length ?? 6
  const gvPumpCols = quarters.gvPump?.rows.length ?? 4
  const coCols = quarters['cox-orange']?.rows.length ?? 5
  const imCols = quarters['ingrid-marie']?.rows.length ?? 15

  const gvX = 20
  const gvY = 30
  const pumpX = gvX + gvMainCols * colW + 20
  const pumpY = gvY
  const coX = gvX + gvMainCols * colW + 20
  const coY = gvY + Math.round(19 * colW)
  const imY = gvY + 38 * colW + 20 + 14
  const imX = gvX

  const w = Math.max(
    coX + coCols * colW + 40,
    pumpX + gvPumpCols * colW + 40,
    imX + imCols * colW + 40
  )
  const h = imY + 23 * colW + 50

  const renderBlock = (block: QuarterBlock | undefined, x: number, y: number) => {
    if (!block) return null
    return (
      <div key={block.name} style={{ position: 'absolute', left: x, top: y, zIndex: 1 }}>
        <div
          className="absolute whitespace-nowrap font-bold"
          style={{
            top: -16,
            left: 0,
            fontSize: Math.max(11, Math.round(13 * zoom)),
            color: block.color,
          }}
        >
          {block.name}
        </div>
        <div className="flex" style={{ gap: g }}>
          {block.rows.map((row) => (
            <VerticalRow
              key={row.label}
              row={row}
              cellSize={cs}
              gap={g}
              onClickPosition={handleClick}
              overlayColorFn={overlayColorFn}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-stone-400">
          Zoom: {Math.round(zoom * 100)}%
        </span>
        <input
          type="range"
          min={50}
          max={250}
          value={Math.round(zoom * 100)}
          onChange={(e) => setZoom(+e.target.value / 100)}
          className="w-24"
        />
      </div>
      <div
        ref={containerRef}
        className="overflow-auto bg-white border border-stone-200 rounded-xl p-3 touch-pan-x touch-pan-y"
      >
        <div style={{ position: 'relative', width: w, height: h, minWidth: w, minHeight: h }}>
          {/* Background zones */}
          <div
            className="absolute rounded-lg"
            style={{
              left: gvX - 8, top: gvY - 8,
              width: gvMainCols * colW + 14, height: 38 * colW + 30,
              background: '#fffbeb', border: '1px solid #f59e0b25',
            }}
          />
          {quarters.gvPump && (
            <div
              className="absolute rounded-lg"
              style={{
                left: pumpX - 8, top: pumpY - 8,
                width: gvPumpCols * colW + 14, height: 12 * colW + 30,
                background: '#fffbeb', border: '1px dashed #f59e0b40',
              }}
            />
          )}
          <div
            className="absolute rounded-lg"
            style={{
              left: coX - 8, top: coY - 8,
              width: coCols * colW + 14, height: 19 * colW + 30,
              background: '#fef2f2', border: '1px solid #ef444425',
            }}
          />
          <div
            className="absolute rounded-lg"
            style={{
              left: imX - 8, top: imY - 8,
              width: imCols * colW + 14, height: 23 * colW + 30,
              background: '#f0fdf4', border: '1px solid #22c55e25',
            }}
          />

          {/* Divider line */}
          <div
            className="absolute"
            style={{
              left: gvX - 12, top: imY - 12,
              width: Math.max(gvMainCols, imCols) * colW + 30,
              height: 0, borderTop: '1.5px dashed #a8a29e',
              zIndex: 2,
            }}
          />

          {/* Compass */}
          <div className="absolute right-2 top-1 flex flex-col items-center text-stone-400 text-xs select-none z-10">
            <span className="font-bold text-sm">N</span>
            <span>↑</span>
          </div>

          {renderBlock(quarters.gvMain, gvX, gvY)}
          {renderBlock(quarters.gvPump, pumpX, pumpY)}
          {renderBlock(quarters['cox-orange'], coX, coY)}
          {renderBlock(quarters['ingrid-marie'], imX, imY)}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 px-1 text-xs text-stone-500">
        {[
          { label: 'Friskt', color: '#22c55e' },
          { label: 'Svagt', color: '#facc15' },
          { label: 'Dött', color: '#1c1917' },
          { label: 'Okänt', color: '#d4d4d4' },
          { label: 'Stubbe', color: '#92400e' },
          { label: 'Tom', color: 'transparent', dashed: true },
          { label: 'Landmärke', color: '#8b5cf6', square: true },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 shrink-0"
              style={{
                borderRadius: l.square ? 2 : '50%',
                background: l.color,
                border: `1px ${l.dashed ? 'dashed' : 'solid'} ${l.color === 'transparent' ? '#a3a3a3' : l.color}`,
              }}
            />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
