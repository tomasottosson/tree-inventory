import { useEffect, useRef } from 'react'
import flatpickr from 'flatpickr'
import type { Instance } from 'flatpickr/dist/types/instance'
import { Swedish } from 'flatpickr/dist/l10n/sv'
import 'flatpickr/dist/flatpickr.min.css'
import './SwedishDatePicker.css'

interface Props {
  value: string
  onChange: (value: string) => void
  className?: string
  required?: boolean
}

export function SwedishDatePicker({ value, onChange, className, required }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const fpRef = useRef<Instance | null>(null)

  useEffect(() => {
    if (!inputRef.current) return

    fpRef.current = flatpickr(inputRef.current, {
      locale: Swedish,
      dateFormat: 'Y-m-d',
      defaultDate: value || undefined,
      onChange([date]) {
        if (date) onChange(date.toISOString().slice(0, 10))
      },
    }) as Instance

    return () => {
      fpRef.current?.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (fpRef.current && value) {
      fpRef.current.setDate(value, false)
    }
  }, [value])

  return (
    <input
      ref={inputRef}
      type="text"
      readOnly
      required={required}
      className={className}
    />
  )
}
