import type { Event } from '../../lib/types'

const EVENT_TYPE_LABELS: Record<string, string> = {
  fertilization: 'Gödsling',
  pruning: 'Beskärning',
  observation: 'Observation',
  harvest: 'Skörd',
  treatment: 'Behandling',
  other: 'Övrigt',
}

const EVENT_TYPE_ICONS: Record<string, string> = {
  fertilization: '🌱',
  pruning: '✂️',
  observation: '👁',
  harvest: '🍎',
  treatment: '💊',
  other: '📝',
}

function formatDetails(type: string, details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return ''
  switch (type) {
    case 'fertilization':
      return [
        details.fertilizer,
        details.amount_kg ? `${details.amount_kg} kg` : null,
        details.method,
      ]
        .filter(Boolean)
        .join(' · ')
    case 'pruning':
      return [details.pruning_type, details.severity].filter(Boolean).join(' · ')
    case 'observation':
      return [
        details.leaf_color ? `Löv: ${details.leaf_color}` : null,
        details.shoot_growth_cm ? `Skott: ${details.shoot_growth_cm} cm` : null,
        details.flowering && details.flowering !== 'none'
          ? `Blomning: ${details.flowering}`
          : null,
        details.disease ? `Sjukdom: ${details.disease}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    case 'harvest':
      return [
        details.amount_kg ? `${details.amount_kg} kg` : null,
        details.quality ? `Klass ${details.quality}` : null,
        details.usage,
      ]
        .filter(Boolean)
        .join(' · ')
    case 'treatment':
      return [details.product, details.reason].filter(Boolean).join(' · ')
    default:
      return ''
  }
}

interface Props {
  events: Event[]
}

export function EventList({ events }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-stone-400 text-center py-4">Inga händelser registrerade</p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map((e) => {
        const detail = formatDetails(e.type, e.details)
        return (
          <div key={e.id} className="flex gap-3 items-start">
            <span className="text-lg leading-none mt-0.5">{EVENT_TYPE_ICONS[e.type] || '📝'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-stone-800">
                  {EVENT_TYPE_LABELS[e.type] || e.type}
                </span>
                <span className="text-xs text-stone-400 shrink-0">
                  {new Date(e.date).toLocaleDateString('sv-SE')}
                </span>
              </div>
              {detail && <p className="text-xs text-stone-500 mt-0.5 truncate">{detail}</p>}
              {e.notes && <p className="text-xs text-stone-400 mt-0.5 italic truncate">{e.notes}</p>}
              <p className="text-xs text-stone-300 mt-0.5">{e.createdBy}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
