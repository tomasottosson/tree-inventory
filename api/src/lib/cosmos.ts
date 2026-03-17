import { CosmosClient, type Container } from '@azure/cosmos'

let client: CosmosClient | null = null
let dbName: string

function getClient(): CosmosClient {
  if (!client) {
    const endpoint = process.env.COSMOS_ENDPOINT
    const key = process.env.COSMOS_KEY
    dbName = process.env.COSMOS_DATABASE || 'appelodlingen'

    if (!endpoint || !key) {
      throw new Error('COSMOS_ENDPOINT and COSMOS_KEY must be set')
    }

    client = new CosmosClient({ endpoint, key })
  }
  return client
}

export function getContainer(name: string): Container {
  return getClient().database(dbName).container(name)
}

export async function ensureDatabase(): Promise<void> {
  const c = getClient()
  await c.databases.createIfNotExists({ id: dbName })

  const db = c.database(dbName)
  await db.containers.createIfNotExists({
    id: 'positions',
    partitionKey: { paths: ['/quarterId'] },
  })
  await db.containers.createIfNotExists({
    id: 'events',
    partitionKey: { paths: ['/positionId'] },
  })
  await db.containers.createIfNotExists({
    id: 'users',
    partitionKey: { paths: ['/id'] },
  })
}
