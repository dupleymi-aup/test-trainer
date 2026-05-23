import { MongoClient, type Db } from 'mongodb'
import { config } from './config'

const globalForMongo = globalThis as unknown as {
  client: MongoClient | undefined
  db: Db | undefined
}

let client: MongoClient | undefined
let db: Db | undefined

if (config.dbType === 'mongodb') {
  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI is required when DB_TYPE=mongodb')
  }

  if (process.env.NODE_ENV === 'production') {
    client = new MongoClient(config.mongodbUri)
    db = client.db()
  } else {
    if (!globalForMongo.client) {
      globalForMongo.client = new MongoClient(config.mongodbUri)
    }
    client = globalForMongo.client
    if (!globalForMongo.db) {
      globalForMongo.db = client.db()
    }
    db = globalForMongo.db
  }
}

export { client, db }

export async function connectMongo() {
  if (client && !client.topology?.isDestroyed) {
    return db!
  }
  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI is required')
  }
  client = new MongoClient(config.mongodbUri)
  await client.connect()
  db = client.db()
  if (process.env.NODE_ENV !== 'production') {
    globalForMongo.client = client
    globalForMongo.db = db
  }
  return db
}

export async function checkMongoConnection(uri?: string): Promise<boolean> {
  const testUri = uri || config.mongodbUri
  if (!testUri) return false
  const testClient = new MongoClient(testUri, {
    serverSelectionTimeoutMS: 2000,
    connectTimeoutMS: 2000,
  })
  try {
    await testClient.connect()
    await testClient.db().command({ ping: 1 })
    return true
  } catch {
    return false
  } finally {
    await testClient.close().catch(() => {})
  }
}
