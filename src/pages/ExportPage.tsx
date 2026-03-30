import { useState } from 'react'
import { useWorkSessions } from '../hooks/useEvents'
import { api } from '../lib/api'
import { WORK_SESSION_AREAS } from '../lib/constants'
import type { Event } from '../lib/types'
import { SwedishDatePicker } from '../components/ui/SwedishDatePicker'

const AREA_LABEL: Record<string, string> = Object.fromEntries(
  WORK_SESSION_AREAS.map((a) => [a.id, a.label])
)

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatActivity(event: Event): string {
  const activity = event.details?.activity as string | undefined
  return capitalize(activity ?? '')
}

export function ExportPage() {
  const [from, setFrom] = useState('2026-01-01')
  const [to, setTo] = useState(today())

  const { data: sessions, isLoading, isError } = useWorkSessions(from, to)

  const totalHours = sessions?.reduce((sum, e) => sum + (e.duration_hours ?? 0), 0) ?? 0

  return (
    <div className="p-4 max-w-2xl mx-auto pb-32">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">Exportera redovisning</h1>
      <p className="text-sm text-stone-500 mb-6">
        Arbetspass för Länsstyrelsens kulturmiljöbidrag
      </p>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Från</label>
          <SwedishDatePicker
            value={from}
            onChange={setFrom}
            className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Till</label>
          <SwedishDatePicker
            value={to}
            onChange={setTo}
            className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
      </div>

      {/* Preview table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-5">
        {isLoading ? (
          <div className="py-10 text-center text-stone-400 text-sm">Laddar…</div>
        ) : isError ? (
          <div className="py-10 text-center text-red-500 text-sm">Kunde inte hämta data.</div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="py-10 text-center text-stone-400 text-sm">
            Inga arbetspass i valt intervall.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 font-medium text-stone-600">Datum</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600">Tim</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Person</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Aktivitet</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Område</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((e) => (
                <tr key={e.id} className="border-b border-stone-50 last:border-0">
                  <td className="px-4 py-3 text-stone-700 tabular-nums">{e.date}</td>
                  <td className="px-4 py-3 text-stone-700 text-right tabular-nums">
                    {e.duration_hours ?? '–'}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{capitalize(e.createdBy)}</td>
                  <td className="px-4 py-3 text-stone-700">{formatActivity(e)}</td>
                  <td className="px-4 py-3 text-stone-500">{AREA_LABEL[e.positionId] ?? e.positionId}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-stone-50 border-t border-stone-200">
                <td className="px-4 py-3 font-semibold text-stone-800">
                  Summa
                </td>
                <td className="px-4 py-3 font-semibold text-stone-800 text-right tabular-nums">
                  {totalHours}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Download button */}
      <a
        href={api.getExportUrl(from, to)}
        download={`arbetspass-${from}-${to}.csv`}
        className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-medium text-base transition-opacity ${
          !sessions || sessions.length === 0
            ? 'bg-stone-100 text-stone-400 pointer-events-none'
            : 'bg-stone-800 text-white'
        }`}
      >
        <span>⬇</span> Ladda ner CSV
      </a>
    </div>
  )
}
