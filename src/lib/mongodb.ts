import { MongoClient, type Db } from 'mongodb'
import { config } from './config'
import { logger } from './logger'

const globalForMongo = globalThis as unknown as {
  client: MongoClient | undefined
  db: Db | undefined
}

let client: MongoClient | undefined
let db: Db | undefined

// Connection options for production resilience
const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  retryWrites: true,
  retryReads: true,
}

if (config.dbType === 'mongodb') {
  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI is required when DB_TYPE=mongodb')
  }

  if (process.env.NODE_ENV === 'production') {
    client = new MongoClient(config.mongodbUri, MONGO_OPTIONS)
    db = client.db()
  } else {
    if (!globalForMongo.client) {
      globalForMongo.client = new MongoClient(config.mongodbUri, MONGO_OPTIONS)
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
  if (client && db) {
    try {
      await client.db().command({ ping: 1 })
      return db
    } catch {
      // Connection is dead, will recreate below
    }
  }
  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI is required')
  }
  client = new MongoClient(config.mongodbUri, MONGO_OPTIONS)
  await client.connect()
  db = client.db()
  if (process.env.NODE_ENV !== 'production') {
    globalForMongo.client = client
    globalForMongo.db = db
  }
  logger.info('MongoDB connected')
  return db
}

/**
 * Gracefully close MongoDB connection (call on process shutdown).
 */
export async function disconnectMongo(): Promise<void> {
  if (client) {
    try {
      await client.close()
      logger.info('MongoDB disconnected')
    } catch {
      // Already closed or error, ignore
    }
  }
  client = undefined
  db = undefined
  if (process.env.NODE_ENV !== 'production') {
    globalForMongo.client = undefined
    globalForMongo.db = undefined
  }
}

// Register graceful shutdown handlers
if (typeof process !== 'undefined' && config.dbType === 'mongodb') {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, closing MongoDB connection...`)
    await disconnectMongo()
    process.exit(0)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
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
