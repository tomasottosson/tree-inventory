import { app, type HttpResponseInit } from '@azure/functions'
import { getContainer, ensureDatabase } from '../lib/cosmos.js'

interface PositionDoc {
  id: string
  quarterId: string
  row: string
  position: number
  type: 'tree' | 'empty' | 'stump' | 'landmark'
  species: string | null
  condition: 'unknown'
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

  // Gravensteiner — pump rows
  const pumpCounts = [12, 11, 10, 8]
  for (let r = 0; r < pumpCounts.length; r++) {
    for (let p = 1; p <= pumpCounts[r]; p++) {
      positions.push({
        ...base,
        id: `gv-p${r + 1}-${p}`,
        quarterId: 'gravensteiner',
        row: `P${r + 1}`,
        position: p,
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
