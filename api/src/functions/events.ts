import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../lib/cosmos.js'

app.http('getEvents', {
  methods: ['GET'],
  route: 'events',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const positionId = req.query.get('positionId')
    const quarterId = req.query.get('quarterId')
    const type = req.query.get('type')
    const from = req.query.get('from')
    const to = req.query.get('to')
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
    } else if (type && from && to) {
      query = 'SELECT * FROM c WHERE c.type = @type AND c.date >= @from AND c.date <= @to ORDER BY c.date ASC'
      parameters.push({ name: '@type', value: type })
      parameters.push({ name: '@from', value: from })
      parameters.push({ name: '@to', value: to })
    } else if (type) {
      query = 'SELECT * FROM c WHERE c.type = @type ORDER BY c.date DESC'
      parameters.push({ name: '@type', value: type })
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
    const event: Record<string, unknown> = {
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

    if (body.duration_hours !== undefined && body.duration_hours !== null) {
      event.duration_hours = body.duration_hours
    }

    const { resource } = await container.items.create(event)
    return { status: 201, jsonBody: resource }
  },
})

// Note: 'events/batch' must stay registered before any future 'events/{id}' route
// to avoid Azure Functions interpreting 'batch' as an id parameter.
app.http('createBatchEvents', {
  methods: ['POST'],
  route: 'events/batch',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const body = (await req.json()) as Record<string, unknown>
    const positions = body.positions as string[] | undefined

    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      return { status: 400, jsonBody: { error: 'positions array is required' } }
    }
    if (!body.type || !body.date) {
      return { status: 400, jsonBody: { error: 'type and date are required' } }
    }

    const container = getContainer('events')
    const createdAt = new Date().toISOString()

    const results = await Promise.all(
      positions.map((positionId) =>
        container.items.create({
          id: `evt-${crypto.randomUUID()}`,
          positionId,
          quarterId: body.quarterId,
          type: body.type,
          date: body.date,
          details: body.details || {},
          notes: body.notes || '',
          createdBy: body.createdBy || 'unknown',
          createdAt,
        })
      )
    )

    return { status: 201, jsonBody: { created: results.length } }
  },
})
