import { useState } from 'react'
import type { EventType } from '../../lib/types'

const EVENT_TYPES: { id: EventType; label: string; icon: string }[] = [
  { id: 'fertilization', label: 'Gödsling', icon: '🌱' },
  { id: 'pruning', label: 'Beskärning', icon: '✂️' },
  { id: 'observation', label: 'Observation', icon: '👁' },
  { id: 'harvest', label: 'Skörd', icon: '🍎' },
  { id: 'treatment', label: 'Behandling', icon: '💊' },
  { id: 'other', label: 'Övrigt', icon: '📝' },
]

const PRUNING_TYPES = ['restaurering', 'underhåll', 'röjning']
const PRUNING_SEVERITY = ['lätt', 'normal', 'kraftig']
const FLOWERING = ['none', 'sparse', 'normal', 'rich']
const FLOWERING_LABELS: Record<string, string> = {
  none: 'Ingen',
  sparse: 'Sparsam',
  normal: 'Normal',
  rich: 'Rik',
}
const HARVEST_QUALITY = ['A', 'B', 'C', 'foder', 'must']

export interface EventFormData {
  type: EventType
  date: string
  details: Record<string, unknown>
  notes: string
}

interface Props {
  onSubmit: (data: EventFormData) => void
  loading?: boolean
}

export function EventForm({ onSubmit, loading }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [type, setType] = useState<EventType>('fertilization')
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState('')

  // Fertilization
  const [fertilizer, setFertilizer] = useState('')
  const [amountKg, setAmountKg] = useState('')
  const [method, setMethod] = useState('')

  // Pruning
  const [pruningType, setPruningType] = useState(PRUNING_TYPES[0])
  const [severity, setSeverity] = useState(PRUNING_SEVERITY[1])

  // Observation
  const [leafColor, setLeafColor] = useState('')
  const [shootGrowth, setShootGrowth] = useState('')
  const [flowering, setFlowering] = useState('none')
  const [disease, setDisease] = useState('')

  // Harvest
  const [amountHarvest, setAmountHarvest] = useState('')
  const [quality, setQuality] = useState(HARVEST_QUALITY[0])
  const [usage, setUsage] = useState('')

  // Treatment
  const [treatmentType, setTreatmentType] = useState('')
  const [product, setProduct] = useState('')
  const [reason, setReason] = useState('')

  function buildDetails(): Record<string, unknown> {
    switch (type) {
      case 'fertilization':
        return {
          ...(fertilizer && { fertilizer }),
          ...(amountKg && { amount_kg: parseFloat(amountKg) }),
          ...(method && { method }),
        }
      case 'pruning':
        return { pruning_type: pruningType, severity }
      case 'observation':
        return {
          ...(leafColor && { leaf_color: leafColor }),
          ...(shootGrowth && { shoot_growth_cm: parseFloat(shootGrowth) }),
          flowering,
          ...(disease && { disease }),
        }
      case 'harvest':
        return {
          ...(amountHarvest && { amount_kg: parseFloat(amountHarvest) }),
          quality,
          ...(usage && { usage }),
        }
      case 'treatment':
        return {
          ...(treatmentType && { treatment_type: treatmentType }),
          ...(product && { product }),
          ...(reason && { reason }),
        }
      default:
        return {}
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ type, date, details: buildDetails(), notes })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Type selector */}
      <div>
        <label className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2 block">
          Typ
        </label>
        <div className="grid grid-cols-3 gap-2">
          {EVENT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={`py-2.5 px-2 rounded-xl text-sm font-medium flex flex-col items-center gap-1 ${
                type === t.id
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-600 active:bg-stone-200'
              }`}
            >
              <span className="text-base">{t.icon}</span>
              <span className="text-xs">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5 block">
          Datum
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-stone-800 text-sm bg-white"
          required
        />
      </div>

      {/* Type-specific fields */}
      {type === 'fertilization' && (
        <div className="flex flex-col gap-3">
          <Field label="Gödselmedel">
            <input
              type="text"
              value={fertilizer}
              onChange={(e) => setFertilizer(e.target.value)}
              placeholder="t.ex. YaraMila Promagna 11-5-18"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mängd (kg)">
              <input
                type="number"
                min="0"
                step="0.1"
                value={amountKg}
                onChange={(e) => setAmountKg(e.target.value)}
                placeholder="0.75"
                className={inputCls}
              />
            </Field>
            <Field label="Metod">
              <input
                type="text"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="Manuell spridning"
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      )}

      {type === 'pruning' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Typ">
            <select value={pruningType} onChange={(e) => setPruningType(e.target.value)} className={inputCls}>
              {PRUNING_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </Field>
          <Field label="Intensitet">
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={inputCls}>
              {PRUNING_SEVERITY.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {type === 'observation' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lövfärg">
              <input
                type="text"
                value={leafColor}
                onChange={(e) => setLeafColor(e.target.value)}
                placeholder="Mörkgrön"
                className={inputCls}
              />
            </Field>
            <Field label="Skottillväxt (cm)">
              <input
                type="number"
                min="0"
                step="0.5"
                value={shootGrowth}
                onChange={(e) => setShootGrowth(e.target.value)}
                placeholder="15"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Blomning">
              <select value={flowering} onChange={(e) => setFlowering(e.target.value)} className={inputCls}>
                {FLOWERING.map((f) => (
                  <option key={f} value={f}>{FLOWERING_LABELS[f]}</option>
                ))}
              </select>
            </Field>
            <Field label="Sjukdom/skada">
              <input
                type="text"
                value={disease}
                onChange={(e) => setDisease(e.target.value)}
                placeholder="—"
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      )}

      {type === 'harvest' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mängd (kg)">
              <input
                type="number"
                min="0"
                step="0.5"
                value={amountHarvest}
                onChange={(e) => setAmountHarvest(e.target.value)}
                placeholder="10"
                className={inputCls}
              />
            </Field>
            <Field label="Kvalitet">
              <select value={quality} onChange={(e) => setQuality(e.target.value)} className={inputCls}>
                {HARVEST_QUALITY.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Användning">
            <input
              type="text"
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
              placeholder="Direktförsäljning"
              className={inputCls}
            />
          </Field>
        </div>
      )}

      {type === 'treatment' && (
        <div className="flex flex-col gap-3">
          <Field label="Behandlingstyp">
            <input
              type="text"
              value={treatmentType}
              onChange={(e) => setTreatmentType(e.target.value)}
              placeholder="Svampbehandling"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preparat">
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Produkt"
                className={inputCls}
              />
            </Field>
            <Field label="Orsak">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Orsak"
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      )}

      {/* Notes */}
      <Field label="Anteckningar (valfritt)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Fri text..."
          className={`${inputCls} resize-none`}
        />
      </Field>

      <button
        type="submit"
        disabled={loading}
        className="py-4 rounded-xl bg-stone-800 text-white font-medium text-base active:bg-stone-700 disabled:opacity-50"
      >
        {loading ? 'Sparar...' : 'Spara händelse'}
      </button>
    </form>
  )
}

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-stone-200 text-stone-800 text-sm bg-white'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  )
}
