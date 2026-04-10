import { useRef, useState } from 'react'
import type { Event } from '../../lib/types'

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  )
}

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
  onDelete?: (event: Event) => void
  deletingId?: string | null
}

const SWIPE_THRESHOLD = -72
const SWIPE_MAX = -112

interface RowProps {
  event: Event
  onDelete?: (event: Event) => void
  isDeleting: boolean
}

function EventRow({ event, onDelete, isDeleting }: RowProps) {
  const detail = formatDetails(event.type, event.details)
  const canDelete = !!onDelete && event.type !== 'work_session'

  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const axisRef = useRef<'h' | 'v' | null>(null)

  const reset = () => {
    setTranslateX(0)
    axisRef.current = null
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canDelete || isDeleting) return
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    axisRef.current = null
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canDelete || isDeleting) return
    const dx = e.touches[0].clientX - startXRef.current
    const dy = e.touches[0].clientY - startYRef.current

    if (axisRef.current === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        axisRef.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      }
    }

    if (axisRef.current === 'h' && dx < 0) {
      setTranslateX(Math.max(dx, SWIPE_MAX))
    }
  }

  const handleTouchEnd = () => {
    if (!canDelete || isDeleting) return
    setIsDragging(false)
    if (translateX <= SWIPE_THRESHOLD) {
      setTranslateX(SWIPE_MAX)
      onDelete!(event)
    } else {
      reset()
    }
  }

  const revealFraction = Math.min(1, Math.abs(translateX) / Math.abs(SWIPE_THRESHOLD))
  const willCommit = translateX <= SWIPE_THRESHOLD

  return (
    <div className="relative overflow-hidden rounded-lg">
      {canDelete && (
        <div
          className="absolute inset-0 flex items-center justify-end pr-4"
          style={{
            backgroundColor: willCommit ? '#dc2626' : '#fca5a5',
            opacity: revealFraction,
          }}
          aria-hidden="true"
        >
          <TrashIcon className="w-5 h-5 text-white" />
        </div>
      )}
      <div
        className="relative bg-white flex gap-3 items-start py-1"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 200ms ease-out',
          touchAction: 'pan-y',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <span className="text-lg leading-none mt-0.5">{EVENT_TYPE_ICONS[event.type] || '📝'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-stone-800">
              {EVENT_TYPE_LABELS[event.type] || event.type}
            </span>
            <span className="text-xs text-stone-400 shrink-0">
              {new Date(event.date).toLocaleDateString('sv-SE')}
            </span>
          </div>
          {detail && <p className="text-xs text-stone-500 mt-0.5 truncate">{detail}</p>}
          {event.notes && <p className="text-xs text-stone-400 mt-0.5 italic truncate">{event.notes}</p>}
          <p className="text-xs text-stone-300 mt-0.5">{event.createdBy}</p>
        </div>
        {canDelete && (
          <div className="shrink-0 flex items-center">
            {isDeleting ? (
              <span className="text-xs text-stone-400 px-2">Raderar…</span>
            ) : confirming ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="text-xs text-stone-500 px-2 py-2 min-h-[44px]"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete!(event)
                    setConfirming(false)
                  }}
                  className="text-xs text-red-600 font-medium px-2 py-2 min-h-[44px]"
                >
                  Radera
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label="Radera händelse"
                className="w-11 h-11 flex items-center justify-center rounded-full text-stone-500 hover:text-red-600 hover:bg-red-50 active:bg-red-100"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function EventList({ events, onDelete, deletingId }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-stone-400 text-center py-4">Inga händelser registrerade</p>
    )
  }

  const hasDeletable = !!onDelete && events.some((e) => e.type !== 'work_session')

  return (
    <div>
      <div className="flex flex-col gap-2">
        {events.map((e) => (
          <EventRow
            key={e.id}
            event={e}
            onDelete={onDelete}
            isDeleting={deletingId === e.id}
          />
        ))}
      </div>
      {hasDeletable && (
        <p className="text-xs text-stone-300 text-center mt-3">
          Svep åt vänster eller tryck på soptunnan för att radera
        </p>
      )}
    </div>
  )
}
