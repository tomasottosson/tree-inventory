import type { Position, PositionType, Condition, Species } from '../../lib/types'
import { CONDITION_LABELS, TYPE_LABELS, SPECIES_OPTIONS } from '../../lib/constants'

interface Props {
  position: Position
  onUpdate: (data: { type: PositionType; condition: Condition; species: Species; notes: string }) => void
  loading?: boolean
}

export function PositionCard({ position, onUpdate, loading }: Props) {
  const handleType = (type: PositionType) => {
    onUpdate({
      type,
      condition: type === 'tree' ? position.condition : 'unknown',
      species: type === 'tree' ? position.species : null,
      notes: position.notes,
    })
  }

  const handleCondition = (condition: Condition) => {
    onUpdate({
      type: position.type,
      condition,
      species: position.species,
      notes: position.notes,
    })
  }

  const handleSpecies = (species: Species) => {
    onUpdate({
      type: position.type,
      condition: position.condition,
      species,
      notes: position.notes,
    })
  }

  return (
    <div className={`bg-white rounded-2xl border border-stone-200 p-4 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-lg font-bold text-stone-800">{position.id}</span>
          <span className="ml-2 text-sm text-stone-400">
            Rad {position.row}, pos {position.position}
          </span>
        </div>
        {position.inventoriedAt && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            Inventerad
          </span>
        )}
      </div>

      {/* Type buttons */}
      <div className="mb-4">
        <label className="text-xs font-medium text-stone-500 mb-2 block">Typ</label>
        <div className="grid grid-cols-4 gap-2">
          {(Object.entries(TYPE_LABELS) as [PositionType, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleType(key)}
              className={`py-3 rounded-xl text-sm font-medium transition-all ${
                position.type === key
                  ? 'bg-stone-800 text-white shadow-md'
                  : 'bg-stone-100 text-stone-600 active:bg-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Condition buttons - only for trees */}
      {position.type === 'tree' && (
        <div className="mb-4">
          <label className="text-xs font-medium text-stone-500 mb-2 block">Skick</label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.entries(CONDITION_LABELS) as [Condition, string][]).map(
              ([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleCondition(key)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    position.condition === key
                      ? key === 'healthy'
                        ? 'bg-green-600 text-white'
                        : key === 'weak'
                          ? 'bg-yellow-500 text-white'
                          : key === 'dead'
                            ? 'bg-stone-800 text-white'
                            : 'bg-stone-400 text-white'
                      : 'bg-stone-100 text-stone-600 active:bg-stone-200'
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Species - only for trees */}
      {position.type === 'tree' && (
        <div className="mb-2">
          <label className="text-xs font-medium text-stone-500 mb-2 block">Sort</label>
          <div className="grid grid-cols-2 gap-2">
            {SPECIES_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSpecies(s)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  position.species === s
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600 active:bg-stone-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
