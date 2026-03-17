import { useState } from 'react'
import { usePositions } from '../hooks/usePositions'
import { RowWalker } from '../components/inventory/RowWalker'
import { QUARTERS } from '../lib/constants'

export function InventoryPage() {
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null)
  const { data: positions, isLoading, isError, error } = usePositions(selectedQuarter ?? undefined)

  if (!selectedQuarter) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-stone-800 mb-4">Inventera</h1>
        <p className="text-sm text-stone-500 mb-4">Välj kvarter att inventera</p>
        <div className="flex flex-col gap-3">
          {QUARTERS.map((q) => (
            <button
              key={q.id}
              onClick={() => setSelectedQuarter(q.id)}
              className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-stone-200 text-left active:bg-stone-50"
            >
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ background: q.color }}
              />
              <div>
                <div className="font-medium text-stone-800">{q.name}</div>
                <div className="text-xs text-stone-400">{q.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const quarter = QUARTERS.find((q) => q.id === selectedQuarter)

  return (
    <div className="p-4 max-w-lg mx-auto">
      <button
        onClick={() => setSelectedQuarter(null)}
        className="text-sm text-stone-400 mb-3 block"
      >
        ← Välj kvarter
      </button>
      {isLoading ? (
        <div className="text-center text-stone-400 py-12">Laddar positioner...</div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-red-600 font-medium mb-2">Kunde inte ladda positioner</p>
          <p className="text-sm text-stone-500">{(error as Error)?.message || 'Okänt fel'}</p>
        </div>
      ) : positions && positions.length > 0 ? (
        <RowWalker
          positions={positions}
          quarterId={selectedQuarter}
          quarterName={quarter?.name || selectedQuarter}
          onDone={() => setSelectedQuarter(null)}
        />
      ) : (
        <div className="text-center text-stone-400 py-12">Inga positioner hittades</div>
      )}
    </div>
  )
}
