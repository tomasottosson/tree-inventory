import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../lib/cosmos.js'

app.http('getPositions', {
  methods: ['GET'],
  route: 'positions',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const quarterId = req.query.get('quarterId')
    const container = getContainer('positions')

    let query: string
    const parameters: { name: string; value: string }[] = []

    if (quarterId) {
      query = 'SELECT * FROM c WHERE c.quarterId = @quarterId'
      parameters.push({ name: '@quarterId', value: quarterId })
    } else {
      query = 'SELECT * FROM c'
    }

    const { resources } = await container.items
      .query({ query, parameters })
      .fetchAll()

    return { jsonBody: resources }
  },
})

app.http('getPosition', {
  methods: ['GET'],
  route: 'positions/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const id = req.params.id
    const container = getContainer('positions')

    // We need to find the position — try each quarter
    for (const quarterId of ['gravensteiner', 'cox-orange', 'ingrid-marie']) {
      try {
        const { resource } = await container.item(id, quarterId).read()
        if (resource) {
          return { jsonBody: resource }
        }
      } catch {
        // not in this partition
      }
    }

    return { status: 404, jsonBody: { error: 'Position not found' } }
  },
})

app.http('updatePosition', {
  methods: ['PATCH'],
  route: 'positions/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const id = req.params.id
    const body = (await req.json()) as Record<string, unknown>
    const container = getContainer('positions')

    // Find existing position
    let existing: Record<string, unknown> | null = null
    let partitionKey = ''

    for (const quarterId of ['gravensteiner', 'cox-orange', 'ingrid-marie']) {
      try {
        const { resource } = await container.item(id, quarterId).read()
        if (resource) {
          existing = resource
          partitionKey = quarterId
          break
        }
      } catch {
        // not in this partition
      }
    }

    if (!existing) {
      return { status: 404, jsonBody: { error: 'Position not found' } }
    }

    const updated = {
      ...existing,
      ...body,
      id, // preserve id
      quarterId: partitionKey, // preserve partition key
      updatedAt: new Date().toISOString(),
    }

    const { resource } = await container.item(id, partitionKey).replace(updated)
    return { jsonBody: resource }
  },
})
