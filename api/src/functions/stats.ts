import { app, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../lib/cosmos.js'

app.http('getStats', {
  methods: ['GET'],
  route: 'stats',
  handler: async (): Promise<HttpResponseInit> => {
    const container = getContainer('positions')

    const { resources } = await container.items
      .query('SELECT c.quarterId, c.type, c.condition, c.inventoriedAt FROM c')
      .fetchAll()

    const quarterMap = new Map<string, {
      quarterId: string; total: number; inventoried: number
      trees: number; empty: number; stumps: number
      healthy: number; weak: number; dead: number
    }>()

    for (const p of resources) {
      let q = quarterMap.get(p.quarterId)
      if (!q) {
        q = {
          quarterId: p.quarterId,
          total: 0, inventoried: 0,
          trees: 0, empty: 0, stumps: 0,
          healthy: 0, weak: 0, dead: 0,
        }
        quarterMap.set(p.quarterId, q)
      }

      q.total++
      if (p.inventoriedAt) q.inventoried++
      if (p.type === 'tree') q.trees++
      if (p.type === 'empty') q.empty++
      if (p.type === 'stump') q.stumps++
      if (p.condition === 'healthy') q.healthy++
      if (p.condition === 'weak') q.weak++
      if (p.condition === 'dead') q.dead++
    }

    const quarters = Array.from(quarterMap.values())
    const totalPositions = quarters.reduce((s, q) => s + q.total, 0)
    const totalInventoried = quarters.reduce((s, q) => s + q.inventoried, 0)

    return { jsonBody: { quarters, totalPositions, totalInventoried } }
  },
})
