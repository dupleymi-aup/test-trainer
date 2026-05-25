import { z } from 'zod'

const dbTypeSchema = z.enum(['sqlite', 'postgres', 'mongodb']).default('sqlite')

const configSchema = z.object({
  dbType: dbTypeSchema,
  databaseUrl: z.string().default('file:./dev.db'),
  mongodbUri: z.string().optional(),
  nextauthSecret: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  nextauthUrl: z.string().default('http://localhost:3000'),
  cronSecret: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpFrom: z.string().optional(),
  emailServer: z.string().optional(),
  emailFrom: z.string().optional(),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
})

export function loadConfig() {
  const raw = {
    dbType: process.env.DB_TYPE,
    databaseUrl: process.env.DATABASE_URL,
    mongodbUri: process.env.MONGODB_URI,
    nextauthSecret: process.env.NEXTAUTH_SECRET,
    nextauthUrl: process.env.NEXTAUTH_URL,
    cronSecret: process.env.CRON_SECRET,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpFrom: process.env.SMTP_FROM,
    emailServer: process.env.EMAIL_SERVER,
    emailFrom: process.env.EMAIL_FROM,
    nodeEnv: process.env.NODE_ENV,
  }

  const parsed = configSchema.safeParse(raw)

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const messages = Object.entries(errors)
      .filter(([, v]) => v?.length)
      .map(([k, v]) => `  - ${k}: ${v!.join(', ')}`)
      .join('\n')
    throw new Error(`Invalid configuration:\n${messages}`)
  }

  const data = parsed.data


  return data
}

export const config = loadConfig()

export type Config = ReturnType<typeof loadConfig>
