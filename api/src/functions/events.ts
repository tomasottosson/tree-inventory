import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../lib/cosmos.js'

app.http('getEvents', {
  methods: ['GET'],
  route: 'events',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const positionId = req.query.get('positionId')
    const quarterId = req.query.get('quarterId')
    const type = req.query.get('type')
    const container = getContainer('events')

    let query: string
    const parameters: { name: string; value: string }[] = []

    if (positionId) {
      query = 'SELECT * FROM c WHERE c.positionId = @positionId ORDER BY c.date DESC'
      parameters.push({ name: '@positionId', value: positionId })
    } else if (quarterId) {
      if (type) {
        query = 'SELECT * FROM c WHERE c.quarterId = @quarterId AND c.type = @type ORDER BY c.date DESC'
        parameters.push({ name: '@quarterId', value: quarterId })
        parameters.push({ name: '@type', value: type })
      } else {
        query = 'SELECT * FROM c WHERE c.quarterId = @quarterId ORDER BY c.date DESC'
        parameters.push({ name: '@quarterId', value: quarterId })
      }
    } else {
      query = 'SELECT * FROM c ORDER BY c.date DESC'
    }

    const { resources } = await container.items
      .query({ query, parameters })
      .fetchAll()

    return { jsonBody: resources }
  },
})

app.http('createEvent', {
  methods: ['POST'],
  route: 'events',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const body = (await req.json()) as Record<string, unknown>

    if (!body.positionId || !body.type || !body.date) {
      return { status: 400, jsonBody: { error: 'positionId, type and date are required' } }
    }

    const container = getContainer('events')
    const event = {
      id: `evt-${crypto.randomUUID()}`,
      positionId: body.positionId,
      quarterId: body.quarterId,
      type: body.type,
      date: body.date,
      details: body.details || {},
      notes: body.notes || '',
      createdBy: body.createdBy || 'unknown',
      createdAt: new Date().toISOString(),
    }

    const { resource } = await container.items.create(event)
    return { status: 201, jsonBody: resource }
  },
})
