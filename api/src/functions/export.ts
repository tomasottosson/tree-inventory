import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../lib/cosmos.js'

const AREA_LABELS: Record<string, string> = {
  gravensteiner: 'Gravensteiner',
  'cox-orange': 'Cox Orange',
  'ingrid-marie': 'Ingrid Marie',
  all: 'Hela odlingen',
}

interface WorkSessionEvent {
  id: string
  positionId: string
  date: string
  duration_hours?: number
  details?: { activity?: string; description?: string }
  createdBy?: string
}

app.http('exportWorkSessions', {
  methods: ['GET'],
  route: 'export/work-sessions',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const from = req.query.get('from')
    const to = req.query.get('to')
    const format = req.query.get('format') || 'csv'

    if (!from || !to) {
      return { status: 400, jsonBody: { error: 'from and to query parameters are required (YYYY-MM-DD)' } }
    }

    const container = getContainer('events')
    const { resources } = await container.items
      .query<WorkSessionEvent>({
        query: 'SELECT * FROM c WHERE c.type = @type AND c.date >= @from AND c.date <= @to ORDER BY c.date ASC',
        parameters: [
          { name: '@type', value: 'work_session' },
          { name: '@from', value: from },
          { name: '@to', value: to },
        ],
      })
      .fetchAll()

    const rows = resources.map((e) => ({
      datum: e.date,
      aktivitet: e.details?.activity ?? '',
      omrade: AREA_LABELS[e.positionId] ?? e.positionId,
      timmar: e.duration_hours ?? 0,
      person: e.createdBy ?? '',
    }))

    const totalHours = rows.reduce((sum, r) => sum + r.timmar, 0)

    if (format === 'json') {
      return { jsonBody: { rows, totalHours } }
    }

    // CSV output
    const lines: string[] = [
      'Datum,Aktivitet,Område,Timmar,Person',
      ...rows.map((r) =>
        [r.datum, capitalize(r.aktivitet), r.omrade, r.timmar, capitalize(r.person)].join(',')
      ),
      `Summa,,,${totalHours},`,
    ]
    const csv = '\uFEFF' + lines.join('\r\n')

    return {
      status: 200,
      body: csv,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="arbetspass-${from}-${to}.csv"`,
      },
    }
  },
})

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}
