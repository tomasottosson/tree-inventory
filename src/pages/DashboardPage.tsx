import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { QUARTER_MAP } from '../lib/constants'
import { useAuth } from '../hooks/useAuth'
import type { EventType } from '../lib/types'

const EVENT_TYPE_LABELS: { type: EventType; label: string; icon: string }[] = [
  { type: 'pruning', label: 'Beskärning', icon: '✂️' },
  { type: 'fertilization', label: 'Gödsling', icon: '🌱' },
  { type: 'observation', label: 'Observation', icon: '👁' },
  { type: 'harvest', label: 'Skörd', icon: '🍎' },
  { type: 'treatment', label: 'Behandling', icon: '💊' },
  { type: 'other', label: 'Övrigt', icon: '📝' },
]

function StatRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-stone-600">{label}</span>
      <span className="ml-auto tabular-nums font-medium text-stone-800">{value}</span>
      <span className="text-xs text-stone-400 w-10 text-right tabular-nums">{Math.round(pct)}%</span>
    </div>
  )
}

function ConditionBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-stone-50 py-2">
      <span className="text-lg font-semibold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-xs text-stone-500">{label}</span>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
  })

  const totals = stats ? stats.quarters.reduce(
    (acc, q) => ({
      trees: acc.trees + q.trees,
      empty: acc.empty + q.empty,
      stumps: acc.stumps + q.stumps,
      healthy: acc.healthy + q.healthy,
      weak: acc.weak + q.weak,
      dead: acc.dead + q.dead,
    }),
    { trees: 0, empty: 0, stumps: 0, healthy: 0, weak: 0, dead: 0 }
  ) : { trees: 0, empty: 0, stumps: 0, healthy: 0, weak: 0, dead: 0 }

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
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={() => navigate('/maintenance')}
          className="py-5 px-4 bg-stone-800 text-white rounded-2xl text-left"
        >
          <span className="text-2xl block mb-1">🌿</span>
          <span className="font-medium">Åtgärder</span>
        </button>
        <button
          onClick={() => navigate('/map')}
          className="py-5 px-4 bg-white border border-stone-200 rounded-2xl text-left text-stone-800"
        >
          <span className="text-2xl block mb-1">🗺</span>
          <span className="font-medium">Karta</span>
        </button>
        <button
          onClick={() => navigate('/work-session')}
          className="py-5 px-4 bg-white border border-stone-200 rounded-2xl text-left text-stone-800"
        >
          <span className="text-2xl block mb-1">⏱</span>
          <span className="font-medium">Logga arbetspass</span>
        </button>
        <button
          onClick={() => navigate('/export')}
          className="py-5 px-4 bg-white border border-stone-200 rounded-2xl text-left text-stone-800"
        >
          <span className="text-2xl block mb-1">📤</span>
          <span className="font-medium">Exportera redovisning</span>
        </button>
      </div>

      {/* Inventory shortcut — all positions covered */}
      <button
        onClick={() => navigate('/inventory')}
        className="w-full flex items-center gap-3 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-left mb-6"
      >
        <span className="text-base">📋</span>
        <div>
          <div className="text-sm font-medium text-stone-600">Uppdatera inventering</div>
          <div className="text-xs text-stone-400">Justera typ, sort eller skick</div>
        </div>
        <span className="ml-auto text-stone-300 text-sm">→</span>
      </button>

      {/* Stats */}
      {isLoading ? (
        <div className="text-center py-8 text-stone-400">Laddar...</div>
      ) : stats ? (
        <>
          {/* Event coverage */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
            <h2 className="text-sm font-semibold text-stone-800 mb-3">Utförda åtgärder</h2>
            <p className="text-xs text-stone-400 mb-3">Antal positioner med minst en händelse</p>
            <div className="flex flex-col gap-2">
              {EVENT_TYPE_LABELS.map(({ type, label, icon }) => {
                const count = stats.eventStats[type] ?? 0
                return (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="text-stone-600">
                      <span className="mr-1.5">{icon}</span>{label}
                    </span>
                    <span className={`tabular-nums font-medium ${count > 0 ? 'text-stone-800' : 'text-stone-300'}`}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Position overview */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
            <h2 className="text-sm font-semibold text-stone-800 mb-3">Positioner</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
              <StatRow label="Träd" value={totals.trees} total={stats.totalPositions} color="#22c55e" />
              <StatRow label="Tomma" value={totals.empty} total={stats.totalPositions} color="#d4d4d4" />
              <StatRow label="Stubbar" value={totals.stumps} total={stats.totalPositions} color="#a8a29e" />
            </div>
            <div className="border-t border-stone-100 pt-3">
              <h3 className="text-xs font-medium text-stone-500 mb-2">Skick (träd)</h3>
              <div className="grid grid-cols-3 gap-2">
                <ConditionBadge label="Friska" value={totals.healthy} color="#22c55e" />
                <ConditionBadge label="Svaga" value={totals.weak} color="#facc15" />
                <ConditionBadge label="Döda" value={totals.dead} color="#1c1917" />
              </div>
            </div>
          </div>

          {/* Per quarter compact */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <h2 className="text-sm font-semibold text-stone-800 mb-3">Per kvarter</h2>
            <div className="flex flex-col gap-3">
              {stats.quarters.map((q) => {
                const info = QUARTER_MAP[q.quarterId]
                return (
                  <div key={q.quarterId} className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: info?.color }}
                    />
                    <span className="text-sm font-medium text-stone-700 min-w-[100px]">
                      {info?.name || q.quarterId}
                    </span>
                    <div className="flex gap-3 text-xs text-stone-500 ml-auto">
                      <span>{q.trees} träd</span>
                      <span>{q.empty} tomma</span>
                      <span>{q.stumps} stub.</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
