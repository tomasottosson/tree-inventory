import { getContainer } from './cosmos.js'

export async function validatePin(userId: string, pin: string): Promise<boolean> {
  const container = getContainer('users')
  try {
    const { resource } = await container.item(userId, userId).read()
    return resource?.pin === pin
  } catch {
    return false
  }
}

export async function getUser(userId: string) {
  const container = getContainer('users')
  const { resource } = await container.item(userId, userId).read()
  if (!resource) return null
  return { id: resource.id, name: resource.name, role: resource.role }
}

// Simple token: base64(userId:timestamp)
export function createToken(userId: string): string {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64')
}

export function parseToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    const [userId] = decoded.split(':')
    return userId || null
  } catch {
    return null
  }
}
