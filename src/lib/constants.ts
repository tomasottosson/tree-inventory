export const QUARTERS = [
  {
    id: 'gravensteiner',
    name: 'Gravensteiner',
    description: 'Norra & centrala kvarteret',
    color: '#f59e0b',
    bg: '#fffbeb',
  },
  {
    id: 'cox-orange',
    name: 'Cox Orange',
    description: 'Mittkvarteret',
    color: '#ef4444',
    bg: '#fef2f2',
  },
  {
    id: 'ingrid-marie',
    name: 'Ingrid Marie',
    description: 'Sydvästra kvarteret',
    color: '#22c55e',
    bg: '#f0fdf4',
  },
] as const

export const QUARTER_MAP = Object.fromEntries(
  QUARTERS.map((q) => [q.id, q])
)

export const CONDITION_LABELS: Record<string, string> = {
  healthy: 'Friskt',
  weak: 'Svagt',
  dead: 'Dött',
  unknown: 'Okänt',
}

export const CONDITION_COLORS: Record<string, string> = {
  healthy: '#22c55e',
  weak: '#facc15',
  dead: '#1c1917',
  unknown: '#d4d4d4',
}

export const TYPE_LABELS: Record<string, string> = {
  tree: 'Träd',
  empty: 'Tom',
  stump: 'Stubbe',
  landmark: 'Landmärke',
}

export const SPECIES_OPTIONS = [
  'Gravensteiner',
  'Cox Orange',
  'Ingrid Marie',
  'Okänd',
] as const

export const USERS = ['tomas', 'mats', 'jonas'] as const

export const WORK_SESSION_ACTIVITIES = [
  'beskärning',
  'gräsklippning',
  'uppsamling',
  'jordkällare',
  'gödsling',
  'övrigt',
] as const

export const WORK_SESSION_AREAS = [
  { id: 'all', label: 'Hela odlingen' },
  { id: 'gravensteiner', label: 'Gravensteiner' },
  { id: 'cox-orange', label: 'Cox Orange' },
  { id: 'ingrid-marie', label: 'Ingrid Marie' },
] as const
