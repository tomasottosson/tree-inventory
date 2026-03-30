export type PositionType = 'tree' | 'empty' | 'stump' | 'landmark'

export type Condition = 'healthy' | 'weak' | 'dead' | 'unknown'

export type Species =
  | 'Gravensteiner'
  | 'Cox Orange'
  | 'Ingrid Marie'
  | 'Okänd'
  | null

export interface Position {
  id: string
  quarterId: string
  row: string
  position: number
  type: PositionType
  species: Species
  condition: Condition
  notes: string
  inventoriedAt: string | null
  inventoriedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface QuarterStats {
  quarterId: string
  total: number
  inventoried: number
  trees: number
  empty: number
  stumps: number
  healthy: number
  weak: number
  dead: number
}

export interface Stats {
  quarters: QuarterStats[]
  totalPositions: number
  totalInventoried: number
  eventStats: Partial<Record<EventType, number>>
}

export type EventType = 'fertilization' | 'pruning' | 'observation' | 'harvest' | 'treatment' | 'other' | 'work_session'

export interface Event {
  id: string
  positionId: string
  quarterId: string
  type: EventType
  date: string
  duration_hours?: number
  details: Record<string, unknown>
  notes: string
  createdBy: string
  createdAt: string
}

export interface CreateEventPayload {
  positionId: string
  quarterId: string
  type: EventType
  date: string
  duration_hours?: number
  details: Record<string, unknown>
  notes: string
  createdBy: string
}

export interface User {
  id: string
  name: string
  role: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface BatchEventPayload {
  positions: string[]
  quarterId: string
  type: EventType
  date: string
  details: Record<string, unknown>
  notes: string
  createdBy: string
}

export interface BatchEventResponse {
  created: number
}
