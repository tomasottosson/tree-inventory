import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { validatePin, getUser, createToken } from '../lib/auth.js'

app.http('login', {
  methods: ['POST'],
  route: 'auth/login',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const body = (await req.json()) as { userId?: string; pin?: string }

    if (!body.userId || !body.pin) {
      return { status: 400, jsonBody: { error: 'userId and pin required' } }
    }

    const valid = await validatePin(body.userId, body.pin)
    if (!valid) {
      return { status: 401, jsonBody: { error: 'Invalid PIN' } }
    }

    const user = await getUser(body.userId)
    if (!user) {
      return { status: 404, jsonBody: { error: 'User not found' } }
    }

    const token = createToken(user.id)
    return { jsonBody: { user, token } }
  },
})
