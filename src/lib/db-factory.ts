import { config } from './config'
import { db as prismaDb } from './db'
import { db as mongoDb, connectMongo } from './mongodb'

export type DbType = 'sqlite' | 'postgres' | 'mongodb'

export interface DBInfo {
  type: DbType
  prisma: typeof prismaDb | null
  mongo: typeof mongoDb | null
  url: string
}

export async function getDbInfo(): Promise<DBInfo> {
  const type = config.dbType

  if (type === 'mongodb') {
    if (!mongoDb) {
      await connectMongo()
    }
    return {
      type,
      prisma: null,
      mongo: mongoDb,
      url: config.mongodbUri || '',
    }
  }

  return {
    type,
    prisma: prismaDb,
    mongo: null,
    url: config.databaseUrl,
  }
}

export async function checkMongoHealth(): Promise<{ ok: boolean; details: string }> {
  if (!config.mongodbUri) {
    return { ok: false, details: 'MONGODB_URI not configured' }
  }
  try {
    const { checkMongoConnection } = await import('./mongodb')
    const ok = await checkMongoConnection()
    return { ok, details: ok ? 'MongoDB reachable' : 'MongoDB unreachable' }
  } catch {
    return { ok: false, details: 'MongoDB check failed' }
  }
}

export async function healthCheck(): Promise<{ ok: boolean; type: DbType; details: string }> {
  try {
    const info = await getDbInfo()

    if (info.type === 'mongodb') {
      if (!info.mongo) return { ok: false, type: 'mongodb', details: 'MongoDB not connected' }
      await info.mongo.command({ ping: 1 })
      return { ok: true, type: 'mongodb', details: 'MongoDB connected' }
    }

    if (info.prisma) {
      await info.prisma.$queryRaw`SELECT 1`
      return { ok: true, type: info.type, details: `${info.type} connected` }
    }

    return { ok: false, type: info.type, details: 'No database client available' }
  } catch (error) {
    return {
      ok: false,
      type: config.dbType,
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
