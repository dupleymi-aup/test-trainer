const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const PRISMA_DIR = path.resolve(__dirname, '..', 'prisma')
const SCHEMA_SQLITE = path.join(PRISMA_DIR, 'schema.prisma')
const SCHEMA_POSTGRES = path.join(PRISMA_DIR, 'schema.postgresql.prisma')
const SCHEMA_ACTIVE = path.join(PRISMA_DIR, 'schema.active.prisma')

const dbType = process.env.DB_TYPE || 'sqlite'

console.log(`Generating Prisma schema for: ${dbType}`)

let sourcePath
if (dbType === 'postgres') {
  sourcePath = SCHEMA_POSTGRES
  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: PostgreSQL schema not found at ${sourcePath}`)
    process.exit(1)
  }
} else if (dbType === 'sqlite') {
  sourcePath = SCHEMA_SQLITE
} else {
  console.log(`MongoDB does not use Prisma schema — skipping generation`)
  process.exit(0)
}

fs.copyFileSync(sourcePath, SCHEMA_ACTIVE)
console.log(`Copied ${path.basename(sourcePath)} -> schema.active.prisma`)

if (process.argv.includes('--generate')) {
  console.log('Running prisma generate...')
  try {
    execSync(`npx prisma generate --schema=${SCHEMA_ACTIVE}`, {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db' },
    })
    console.log('Prisma client generated successfully')
  } catch (error) {
    console.error('Failed to generate Prisma client')
    process.exit(1)
  }
}
