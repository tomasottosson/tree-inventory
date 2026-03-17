import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { QUARTER_MAP } from '../lib/constants'
import { useAuth } from '../hooks/useAuth'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
  })

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Äppelodlingen</h1>
          <p className="text-sm text-stone-500">Inloggad som {user?.name}</p>
        </div>
        <button
          onClick={logout}
          className="text-xs text-stone-400 px-3 py-1.5 rounded-lg border border-stone-200"
        >
          Logga ut
        </button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => navigate('/inventory')}
          className="py-5 px-4 bg-stone-800 text-white rounded-2xl text-left"
        >
          <span className="text-2xl block mb-1">📋</span>
          <span className="font-medium">Inventera</span>
        </button>
        <button
          onClick={() => navigate('/map')}
          className="py-5 px-4 bg-white border border-stone-200 rounded-2xl text-left text-stone-800"
        >
          <span className="text-2xl block mb-1">🗺</span>
          <span className="font-medium">Karta</span>
        </button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="text-center py-8 text-stone-400">Laddar...</div>
      ) : stats ? (
        <>
          {/* Total progress */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-stone-600">Total inventering</span>
              <span className="text-sm text-stone-500">
                {stats.totalInventoried}/{stats.totalPositions}
              </span>
            </div>
            <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{
                  width: `${(stats.totalInventoried / stats.totalPositions) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs text-stone-400 mt-1 block">
              {Math.round((stats.totalInventoried / stats.totalPositions) * 100)}% klart
            </span>
          </div>

          {/* Per quarter */}
          <div className="flex flex-col gap-3">
            {stats.quarters.map((q) => {
              const info = QUARTER_MAP[q.quarterId]
              return (
                <div
                  key={q.quarterId}
                  className="bg-white rounded-2xl border border-stone-200 p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: info?.color }}
                    />
                    <span className="font-medium text-stone-800">
                      {info?.name || q.quarterId}
                    </span>
                    <span className="ml-auto text-xs text-stone-400">
                      {q.total} positioner
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(q.inventoried / q.total) * 100}%`,
                        background: info?.color,
                      }}
                    />
                  </div>

                  <div className="flex gap-3 text-xs text-stone-500">
                    <span>{q.inventoried} inventerade</span>
                    <span>|</span>
                    <span>{q.trees} träd</span>
                    <span>{q.empty} tomma</span>
                    <span>{q.stumps} stubbar</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}
