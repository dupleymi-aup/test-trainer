import { PrismaClient } from '@prisma/client'
import { getConfig } from './config'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createDb(): PrismaClient {
  const config = getConfig()
  if (config.dbType === 'mongodb') {
    throw new Error(
      'Do not import from @/lib/db when DB_TYPE=mongodb. Use @/lib/mongodb instead.'
    )
  }
  return new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
  })
}

export const db =
  globalForPrisma.prisma ?? createDb()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
