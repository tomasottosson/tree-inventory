import { useState, useEffect } from 'react'
import { usePositions } from '../hooks/usePositions'
import { useCreateBatchEvents } from '../hooks/useEvents'
import { useAuth } from '../hooks/useAuth'
import { QUARTERS } from '../lib/constants'
import { MaintenanceQuarterMap } from '../components/maintenance/MaintenanceQuarterMap'
import { MaintenanceEventForm } from '../components/maintenance/MaintenanceEventForm'
import type { EventFormData } from '../components/events/EventForm'

export function MaintenancePage() {
  const { user } = useAuth()
  const [quarterId, setQuarterId] = useState('gravensteiner')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: positions, isLoading, isError } = usePositions(quarterId)
  const batchCreate = useCreateBatchEvents()

  function changeQuarter(id: string) {
    setQuarterId(id)
    setSelected(new Set())
  }

  // Auto-dismiss success banner
  useEffect(() => {
    if (!successMsg) return
    const t = setTimeout(() => setSuccessMsg(null), 4000)
    return () => clearTimeout(t)
  }, [successMsg])

  function handleSubmit(formData: EventFormData) {
    if (selected.size === 0) return
    setErrorMsg(null)
    batchCreate.mutate(
      {
        positions: [...selected],
        quarterId,
        type: formData.type,
        date: formData.date,
        details: formData.details,
        notes: formData.notes,
        createdBy: user?.id ?? 'unknown',
      },
      {
        onSuccess: (res) => {
          setSuccessMsg(`${res.created} åtgärder loggade`)
          setSelected(new Set())
        },
        onError: () => {
          setErrorMsg('Något gick fel. Försök igen.')
        },
      }
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-32">
      <h1 className="text-xl font-bold text-stone-800 mb-4">Åtgärder</h1>

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
          <span>✓</span>
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="ml-auto text-green-500"
          >
            ×
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Quarter selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {QUARTERS.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => changeQuarter(q.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              quarterId === q.id
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-600 active:bg-stone-200'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: q.color }}
            />
            {q.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center text-stone-400 py-12">Laddar positioner...</div>
      ) : isError ? (
        <div className="text-center py-12 text-red-600 text-sm">Kunde inte ladda positioner</div>
      ) : (
        <>
          {/* Spatial quarter map with drag-select */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
            <MaintenanceQuarterMap
              positions={positions ?? []}
              quarterId={quarterId}
              selected={selected}
              onChange={setSelected}
            />
          </div>

          {/* Event form */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <MaintenanceEventForm
              selectedCount={selected.size}
              onSubmit={handleSubmit}
              loading={batchCreate.isPending}
            />
          </div>
        </>
      )}
    </div>
  )
}
