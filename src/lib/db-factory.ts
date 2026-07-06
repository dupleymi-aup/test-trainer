import { getConfig } from './config'
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
  const cfg = getConfig()

  if (cfg.dbType === 'mongodb') {
    if (!mongoDb) {
      await connectMongo()
    }
    return {
      type: cfg.dbType,
      prisma: null,
      mongo: mongoDb,
      url: cfg.mongodbUri || '',
    }
  }

  return {
    type: cfg.dbType,
    prisma: prismaDb,
    mongo: null,
    url: cfg.databaseUrl,
  }
}

export async function checkMongoHealth(): Promise<{ ok: boolean; details: string }> {
  const cfg = getConfig()
  if (!cfg.mongodbUri) {
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
      type: getConfig().dbType,
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
