import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCreateEvent } from '../hooks/useEvents'
import { WORK_SESSION_ACTIVITIES, WORK_SESSION_AREAS } from '../lib/constants'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function WorkSessionPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const createEvent = useCreateEvent()

  const [date, setDate] = useState(today())
  const [areaId, setAreaId] = useState<string>('all')
  const [activity, setActivity] = useState<string>('')
  const [hours, setHours] = useState<number>(1)
  const [description, setDescription] = useState('')
  const [saved, setSaved] = useState(false)

  function adjustHours(delta: number) {
    setHours((h) => Math.max(0.5, Math.round((h + delta) * 2) / 2))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activity) return

    createEvent.mutate(
      {
        positionId: areaId,
        quarterId: areaId,
        type: 'work_session',
        date,
        duration_hours: hours,
        details: { activity, description },
        notes: '',
        createdBy: user?.id ?? 'unknown',
      },
      { onSuccess: () => setSaved(true) }
    )
  }

  if (saved) {
    return (
      <div className="p-6 max-w-lg mx-auto flex flex-col items-center gap-6 pt-16">
        <div className="text-5xl">✅</div>
        <div className="text-center">
          <p className="text-xl font-semibold text-stone-800 mb-1">Arbetspass sparat!</p>
          <p className="text-stone-500 text-sm">
            {hours} tim — {activity} — {WORK_SESSION_AREAS.find((a) => a.id === areaId)?.label}
          </p>
        </div>
        <div className="flex flex-col w-full gap-3">
          <button
            onClick={() => {
              setSaved(false)
              setActivity('')
              setDescription('')
              setHours(1)
              setDate(today())
            }}
            className="w-full py-4 bg-stone-800 text-white rounded-2xl font-medium text-base"
          >
            Logga nytt pass
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 bg-white border border-stone-200 text-stone-800 rounded-2xl font-medium text-base"
          >
            Gå till Översikt
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-32">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">Logga arbetspass</h1>
      <p className="text-sm text-stone-500 mb-6">Registrera tid för Länsstyrelsens redovisning</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Datum */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Datum</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 text-base focus:outline-none focus:ring-2 focus:ring-stone-400"
            required
          />
        </div>

        {/* Område */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Område</label>
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 text-base focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            {WORK_SESSION_AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* Aktivitet */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Aktivitet</label>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 text-base focus:outline-none focus:ring-2 focus:ring-stone-400"
            required
          >
            <option value="" disabled>
              Välj aktivitet…
            </option>
            {WORK_SESSION_ACTIVITIES.map((a) => (
              <option key={a} value={a}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Timmar */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Timmar</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => adjustHours(-0.5)}
              className="w-12 h-12 rounded-xl bg-stone-100 text-stone-800 text-xl font-bold flex items-center justify-center active:bg-stone-200"
            >
              −
            </button>
            <span className="flex-1 text-center text-2xl font-semibold text-stone-800 tabular-nums">
              {hours}
            </span>
            <button
              type="button"
              onClick={() => adjustHours(0.5)}
              className="w-12 h-12 rounded-xl bg-stone-100 text-stone-800 text-xl font-bold flex items-center justify-center active:bg-stone-200"
            >
              +
            </button>
          </div>
        </div>

        {/* Beskrivning */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Beskrivning <span className="text-stone-400 font-normal">(valfritt)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="t.ex. Rad G1–G3, uppsamling av grenar"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 text-base focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={!activity || createEvent.isPending}
          className="w-full py-4 bg-stone-800 text-white rounded-2xl font-medium text-base disabled:opacity-40 mt-2"
        >
          {createEvent.isPending ? 'Sparar…' : 'Spara arbetspass'}
        </button>

        {createEvent.isError && (
          <p className="text-red-600 text-sm text-center">
            Något gick fel. Försök igen.
          </p>
        )}
      </form>
    </div>
  )
}
