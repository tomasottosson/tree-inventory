import { EventForm } from '../events/EventForm'
import type { EventFormData } from '../events/EventForm'

interface Props {
  selectedCount: number
  onSubmit: (data: EventFormData) => void
  loading: boolean
}

export function MaintenanceEventForm({ selectedCount, onSubmit, loading }: Props) {
  const submitLabel =
    selectedCount > 0 ? `Logga för ${selectedCount} träd` : 'Välj träd ovan'

  return (
    <div>
      <EventForm
        onSubmit={onSubmit}
        loading={loading}
        submitLabel={submitLabel}
      />
    </div>
  )
}
