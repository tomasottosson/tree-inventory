import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePosition, useUpdatePosition } from '../hooks/usePositions'
import { useEvents, useCreateEvent, useDeleteEvent } from '../hooks/useEvents'
import { PositionCard } from '../components/inventory/PositionCard'
import { EventList } from '../components/events/EventList'
import { EventForm, type EventFormData } from '../components/events/EventForm'
import { QUARTER_MAP, CONDITION_LABELS, TYPE_LABELS } from '../lib/constants'
import type { PositionType, Condition, Species } from '../lib/types'

export function PositionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: position, isLoading } = usePosition(id!)
  const update = useUpdatePosition()
  const { data: events, isLoading: eventsLoading } = useEvents({ positionId: id! })
  const createEvent = useCreateEvent()
  const deleteEvent = useDeleteEvent()
  const [showEventForm, setShowEventForm] = useState(false)

  if (isLoading) {
    return <div className="p-4 text-center py-12 text-stone-400">Laddar...</div>
  }

  if (!position) {
    return <div className="p-4 text-center py-12 text-stone-500">Position hittades inte</div>
  }

  const quarter = QUARTER_MAP[position.quarterId]

  const handleUpdate = (data: { type: PositionType; condition: Condition; species: Species; notes: string }) => {
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}')
    update.mutate({
      id: position.id,
      data: {
        ...data,
        inventoriedAt: new Date().toISOString(),
        inventoriedBy: user.id || 'unknown',
      },
    })
  }

  const handleEventSubmit = (data: EventFormData) => {
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}')
    createEvent.mutate(
      {
        positionId: position.id,
        quarterId: position.quarterId,
        type: data.type,
        date: data.date,
        details: data.details,
        notes: data.notes,
        createdBy: user.id || 'unknown',
      },
      {
        onSuccess: () => setShowEventForm(false),
      }
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-stone-400 mb-3 block"
      >
        ← Tillbaka
      </button>

      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full" style={{ background: quarter?.color }} />
        <span className="text-sm text-stone-500">{quarter?.name}</span>
      </div>

      <PositionCard
        position={position}
        onUpdate={handleUpdate}
        loading={update.isPending}
      />

      {/* Info */}
      <div className="mt-4 bg-white rounded-2xl border border-stone-200 p-4 text-sm">
        <h3 className="font-medium text-stone-800 mb-2">Information</h3>
        <div className="grid grid-cols-2 gap-y-2 text-stone-600">
          <span className="text-stone-400">Typ</span>
          <span>{TYPE_LABELS[position.type]}</span>
          <span className="text-stone-400">Skick</span>
          <span>{CONDITION_LABELS[position.condition]}</span>
          <span className="text-stone-400">Sort</span>
          <span>{position.species || '—'}</span>
          {position.inventoriedAt && (
            <>
              <span className="text-stone-400">Inventerad</span>
              <span>
                {new Date(position.inventoriedAt).toLocaleDateString('sv-SE')}
                {position.inventoriedBy && ` av ${position.inventoriedBy}`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Events */}
      <div className="mt-4 bg-white rounded-2xl border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-stone-800">Händelser</h3>
          <button
            onClick={() => setShowEventForm(!showEventForm)}
            className="text-xs font-medium text-stone-600 px-3 py-1.5 rounded-lg border border-stone-200 active:bg-stone-50"
          >
            {showEventForm ? 'Avbryt' : '+ Logga'}
          </button>
        </div>

        {showEventForm && (
          <div className="mb-4 pt-3 border-t border-stone-100">
            <EventForm onSubmit={handleEventSubmit} loading={createEvent.isPending} />
          </div>
        )}

        {eventsLoading ? (
          <p className="text-sm text-stone-400 text-center py-2">Laddar händelser...</p>
        ) : (
          <EventList
            events={events ?? []}
            onDelete={(e) => deleteEvent.mutate({ id: e.id, positionId: e.positionId })}
            deletingId={deleteEvent.isPending ? deleteEvent.variables?.id ?? null : null}
          />
        )}
      </div>
    </div>
  )
}
