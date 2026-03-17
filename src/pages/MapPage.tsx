import { usePositions } from '../hooks/usePositions'
import { OrchardMap } from '../components/map/OrchardMap'

export function MapPage() {
  const { data: positions, isLoading, error } = usePositions()

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-stone-800 mb-3">Karta</h1>
      {isLoading && <div className="text-center py-12 text-stone-400">Laddar karta...</div>}
      {error && <div className="text-center py-12 text-red-500">Kunde inte ladda data</div>}
      {positions && <OrchardMap positions={positions} />}
    </div>
  )
}
