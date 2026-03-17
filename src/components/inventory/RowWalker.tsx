import { useState, useMemo, useCallback } from 'react'
import type { Position, PositionType, Condition, Species } from '../../lib/types'
import { useUpdatePosition } from '../../hooks/usePositions'
import { PositionCard } from './PositionCard'

interface Props {
  positions: Position[]
  quarterId: string
  quarterName: string
  onDone: () => void
}

export function RowWalker({ positions, quarterId, quarterName, onDone }: Props) {
  const rows = useMemo(() => {
    const map = new Map<string, Position[]>()
    for (const p of positions) {
      const arr = map.get(p.row) || []
      arr.push(p)
      map.set(p.row, arr)
    }
    const result: { label: string; positions: Position[] }[] = []
    for (const [label, pos] of map) {
      pos.sort((a, b) => a.position - b.position)
      result.push({ label, positions: pos })
    }
    result.sort((a, b) => {
      if (a.label.startsWith('P') && !b.label.startsWith('P')) return 1
      if (!a.label.startsWith('P') && b.label.startsWith('P')) return -1
      const aNum = parseInt(a.label.replace(/\D/g, ''))
      const bNum = parseInt(b.label.replace(/\D/g, ''))
      return aNum - bNum
    })
    return result
  }, [positions])

  const [rowIdx, setRowIdx] = useState(0)
  const [posIdx, setPosIdx] = useState(0)
  const update = useUpdatePosition()

  const currentRow = rows[rowIdx]
  const currentPos = currentRow?.positions[posIdx]

  const totalPositions = positions.length
  const inventoried = positions.filter((p) => p.inventoriedAt).length

  // Count positions before current
  const positionsBefore = useMemo(() => {
    let count = 0
    for (let r = 0; r < rowIdx; r++) count += rows[r].positions.length
    count += posIdx
    return count
  }, [rows, rowIdx, posIdx])

  const goNext = useCallback(() => {
    if (posIdx < currentRow.positions.length - 1) {
      setPosIdx(posIdx + 1)
    } else if (rowIdx < rows.length - 1) {
      setRowIdx(rowIdx + 1)
      setPosIdx(0)
    } else {
      onDone()
    }
  }, [posIdx, rowIdx, currentRow, rows, onDone])

  const goPrev = useCallback(() => {
    if (posIdx > 0) {
      setPosIdx(posIdx - 1)
    } else if (rowIdx > 0) {
      setRowIdx(rowIdx - 1)
      setPosIdx(rows[rowIdx - 1].positions.length - 1)
    }
  }, [posIdx, rowIdx, rows])

  const handleUpdate = useCallback(
    (data: { type: PositionType; condition: Condition; species: Species; notes: string }) => {
      if (!currentPos) return
      const user = JSON.parse(localStorage.getItem('auth_user') || '{}')
      update.mutate({
        id: currentPos.id,
        data: {
          ...data,
          inventoriedAt: new Date().toISOString(),
          inventoriedBy: user.id || 'unknown',
        },
      })
    },
    [currentPos, update]
  )

  if (!currentPos) return null

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">{quarterName}</h2>
          <span className="text-sm text-stone-500">
            Rad {currentRow.label} — {posIdx + 1}/{currentRow.positions.length}
          </span>
        </div>
        <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">
          {inventoried}/{totalPositions} inventerade
        </span>
      </div>

      {/* Progress */}
      <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-stone-800 transition-all duration-300 rounded-full"
          style={{ width: `${(positionsBefore / totalPositions) * 100}%` }}
        />
      </div>

      {/* Row pills */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {rows.map((r, i) => (
          <button
            key={r.label}
            onClick={() => { setRowIdx(i); setPosIdx(0) }}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
              i === rowIdx
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-500'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Current position card */}
      <PositionCard
        position={currentPos}
        onUpdate={handleUpdate}
        loading={update.isPending}
      />

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={goPrev}
          disabled={rowIdx === 0 && posIdx === 0}
          className="flex-1 py-4 rounded-xl text-base font-medium bg-stone-100 text-stone-600 disabled:opacity-30 active:bg-stone-200"
        >
          Föregående
        </button>
        <button
          onClick={goNext}
          className="flex-1 py-4 rounded-xl text-base font-medium bg-stone-800 text-white active:bg-stone-700"
        >
          {rowIdx === rows.length - 1 && posIdx === currentRow.positions.length - 1
            ? 'Klar!'
            : 'Nästa'}
        </button>
      </div>
    </div>
  )
}
