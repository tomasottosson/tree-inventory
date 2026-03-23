import { app, type HttpResponseInit } from '@azure/functions'
import { getContainer, ensureDatabase } from '../lib/cosmos.js'

interface PositionDoc {
  id: string
  quarterId: string
  row: string
  position: number
  type: 'tree' | 'empty' | 'stump' | 'landmark'
  species: string | null
  condition: 'healthy' | 'weak' | 'dead' | 'unknown'
  notes: string
  inventoriedAt: null
  inventoriedBy: null
  createdAt: string
  updatedAt: string
}

function generatePositions(): PositionDoc[] {
  const now = new Date().toISOString()
  const positions: PositionDoc[] = []

  const base = {
    type: 'tree' as const,
    species: null,
    condition: 'unknown' as const,
    notes: '',
    inventoriedAt: null,
    inventoriedBy: null,
    createdAt: now,
    updatedAt: now,
  }

  // Gravensteiner — 6 main rows × 38 positions
  for (let r = 1; r <= 6; r++) {
    for (let p = 1; p <= 38; p++) {
      positions.push({
        ...base,
        id: `gv-${r}-${p}`,
        quarterId: 'gravensteiner',
        row: `G${r}`,
        position: p,
      })
    }
  }

  // Gravensteiner — pump rows (P1: 13, P2: 12, P3: 11, P4: 10)
  // Position 1 of each row is empty (discovered during field inventory 2026-03-22)
  // P4 position 10 is a tree/weak (appended after field inventory)
  const pumpCounts = [13, 12, 11, 10]
  for (let r = 0; r < pumpCounts.length; r++) {
    for (let p = 1; p <= pumpCounts[r]; p++) {
      const isFirstPos = p === 1
      const isP4LastPos = r === 3 && p === 10
      positions.push({
        ...base,
        id: `gv-p${r + 1}-${p}`,
        quarterId: 'gravensteiner',
        row: `P${r + 1}`,
        position: p,
        type: isFirstPos ? 'empty' : isP4LastPos ? 'tree' : base.type,
        condition: isP4LastPos ? 'weak' : base.condition,
      })
    }
  }

  // Cox Orange — 5 rows × 19
  for (let r = 1; r <= 5; r++) {
    for (let p = 1; p <= 19; p++) {
      positions.push({
        ...base,
        id: `co-${r}-${p}`,
        quarterId: 'cox-orange',
        row: `C${r}`,
        position: p,
      })
    }
  }

  // Ingrid Marie — 12×23 + 3×20
  for (let r = 1; r <= 15; r++) {
    const count = r <= 12 ? 23 : 20
    for (let p = 1; p <= count; p++) {
      positions.push({
        ...base,
        id: `im-${r}-${p}`,
        quarterId: 'ingrid-marie',
        row: `I${r}`,
        position: p,
      })
    }
  }

  return positions
}

function generateUsers() {
  return [
    { id: 'tomas', name: 'Tomas Ottosson', email: 'tomas.ottosson@gmail.com', role: 'owner', pin: '1234' },
    { id: 'mats', name: 'Mats', email: '', role: 'owner', pin: '1234' },
    { id: 'jonas', name: 'Jonas', email: '', role: 'owner', pin: '1234' },
  ]
}

app.http('seed', {
  methods: ['POST'],
  route: 'seed',
  handler: async (): Promise<HttpResponseInit> => {
    try {
      await ensureDatabase()

      const posContainer = getContainer('positions')
      const userContainer = getContainer('users')

      // Seed users first so login works even if positions fail
      const users = generateUsers()
      for (const user of users) {
        await userContainer.items.upsert(user)
      }

      const positions = generatePositions()
      let created = 0

      // Batch create positions — use upsert to be idempotent
      for (const pos of positions) {
        await posContainer.items.upsert(pos)
        created++
      }

      return {
        jsonBody: {
          created,
          users: users.length,
          message: `Seeded ${created} positions and ${users.length} users`,
        },
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { status: 500, jsonBody: { error: message } }
    }
  },
})
