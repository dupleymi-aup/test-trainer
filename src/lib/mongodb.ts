import { MongoClient, type Db } from 'mongodb'
import { getConfig } from './config'
import { logger } from './logger'

const globalForMongo = globalThis as unknown as {
  client: MongoClient | undefined
  db: Db | undefined
}

let client: MongoClient | undefined
let db: Db | undefined

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  retryWrites: true,
  retryReads: true,
}

function initMongo() {
  const cfg = getConfig()
  if (cfg.dbType !== 'mongodb') return
  if (!cfg.mongodbUri) {
    throw new Error('MONGODB_URI is required when DB_TYPE=mongodb')
  }

  if (process.env.NODE_ENV === 'production') {
    client = new MongoClient(cfg.mongodbUri, MONGO_OPTIONS)
    db = client.db()
  } else {
    if (!globalForMongo.client) {
      globalForMongo.client = new MongoClient(cfg.mongodbUri, MONGO_OPTIONS)
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
  const cfg = getConfig()
  if (client && db) {
    try {
      await client.db().command({ ping: 1 })
      return db
    } catch (err) {
      logger.warn('MongoDB ping failed, reconnecting', { err: err instanceof Error ? err.message : String(err) })
    }
  }
  if (!cfg.mongodbUri) {
    throw new Error('MONGODB_URI is required')
  }
  client = new MongoClient(cfg.mongodbUri, MONGO_OPTIONS)
  await client.connect()
  db = client.db()
  if (process.env.NODE_ENV !== 'production') {
    globalForMongo.client = client
    globalForMongo.db = db
  }
  logger.info('MongoDB connected')
  return db
}

export async function disconnectMongo(): Promise<void> {
  if (client) {
    try {
      await client.close()
      logger.info('MongoDB disconnected')
    } catch (err) {
      logger.warn('MongoDB close error', { err: err instanceof Error ? err.message : String(err) })
    }
  }
  client = undefined
  db = undefined
  if (process.env.NODE_ENV !== 'production') {
    globalForMongo.client = undefined
    globalForMongo.db = undefined
  }
}

export async function checkMongoConnection(uri?: string): Promise<boolean> {
  const cfg = getConfig()
  const testUri = uri || cfg.mongodbUri
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
    await testClient.close().catch((err) => {
      logger.warn('MongoDB test client close error', { err: err instanceof Error ? err.message : String(err) })
    })
  }
}

initMongo()

if (typeof process !== 'undefined' && getConfig().dbType === 'mongodb') {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, closing MongoDB connection...`)
    await disconnectMongo()
    process.exit(0)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}
