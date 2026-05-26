import { config } from './config'
import { db as prismaDb } from './db'
import { db as mongoDb, connectMongo, checkMongoConnection } from './mongodb'
import net from 'net'

export type DbType = 'sqlite' | 'postgres' | 'mongodb'

export interface DBInfo {
  type: DbType
  prisma: ReturnType<typeof getPrismaClient> | null
  mongo: typeof mongoDb | null
  url: string
}

function getPrismaClient() {
  return prismaDb
}

export async function checkPostgresConnection(host = '127.0.0.1', port = 5432): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => {
      resolve(false)
    })
    socket.setTimeout(2000, () => {
      socket.destroy()
      resolve(false)
    })
  })
}

export async function checkSQLiteConnection(): Promise<boolean> {
  try {
    await prismaDb.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

export async function detectDbType(): Promise<DbType> {
  // Use config which validates DB_TYPE via Zod — no unsafe cast needed
  if (config.dbType) {
    return config.dbType;
  }

  const pgAvailable = await checkPostgresConnection()
  if (pgAvailable) return 'postgres'

  const mongoAvailable = await checkMongoConnection()
  if (mongoAvailable) return 'mongodb'

  return 'sqlite'
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
    prisma: getPrismaClient(),
    mongo: null,
    url: config.databaseUrl,
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
