import { PrismaClient } from '@prisma/client'
import { config } from './config'
import { logger } from './logger'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

if (config.dbType === 'mongodb') {
  throw new Error(
    'Do not import from @/lib/db when DB_TYPE=mongodb. Use @/lib/mongodb instead.'
  )
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export async function checkConnection(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`
    return true
  } catch (err) {
    logger.warn(`Prisma connection check failed: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}
