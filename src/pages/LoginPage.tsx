import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const USERS = [
  { id: 'tomas', name: 'Tomas' },
  { id: 'mats', name: 'Mats' },
  { id: 'jonas', name: 'Jonas' },
]

export function LoginPage() {
  const { login, loading, error } = useAuth()
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [pin, setPin] = useState('')

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    if (next.length === 4 && selectedUser) {
      login(selectedUser, next)
    }
  }

  const handleBackspace = () => {
    setPin(pin.slice(0, -1))
  }

  if (!selectedUser) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-stone-800 mb-1">Äppelodlingen</h1>
          <p className="text-stone-500">Välj ditt namn</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {USERS.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUser(u.id)}
              className="py-4 px-6 bg-white rounded-2xl border border-stone-200 text-lg font-medium text-stone-800 active:bg-stone-50 transition-colors shadow-sm"
            >
              {u.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-stone-800 mb-1">
          Hej, {USERS.find((u) => u.id === selectedUser)?.name}
        </h1>
        <p className="text-stone-500">Ange din PIN-kod</p>
      </div>

      {/* PIN dots */}
      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all ${
              i < pin.length ? 'bg-stone-800 scale-110' : 'bg-stone-200'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-500 text-sm mb-4">{error}</p>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'].map((d) =>
          d === '' ? (
            <div key="empty" />
          ) : (
            <button
              key={d}
              onClick={() => (d === '←' ? handleBackspace() : handlePinDigit(d))}
              disabled={loading}
              className="py-4 text-xl font-medium rounded-2xl bg-white border border-stone-200 text-stone-800 active:bg-stone-100 disabled:opacity-50 transition-colors"
            >
              {d}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => { setSelectedUser(null); setPin('') }}
        className="mt-6 text-sm text-stone-400"
      >
        Tillbaka
      </button>
    </div>
  )
}
