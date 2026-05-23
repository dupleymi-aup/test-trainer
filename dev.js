const { execSync } = require('child_process')
const path = require('path')

const SCRIPTS_DIR = path.resolve(__dirname, 'scripts')

// Auto-detect database and find available port
console.log('Detecting database and finding available port...')
const detectOutput = execSync(`node ${path.join(SCRIPTS_DIR, 'find-db.js')}`, {
  encoding: 'utf8',
  env: process.env,
}).trim()

let dbConfig
try {
  dbConfig = JSON.parse(detectOutput)
} catch (e) {
  console.error('Failed to parse database detection output:', detectOutput)
  process.exit(1)
}

const { dbType, databaseUrl, port } = dbConfig

console.log(`Database: ${dbType}`)
console.log(`Port: ${port}`)

// Set environment variables
const env = {
  ...process.env,
  DB_TYPE: dbType,
  PORT: port,
}

if (dbType === 'mongodb') {
  env.MONGODB_URI = databaseUrl
  console.log(`MongoDB URI: ${databaseUrl.replace(/\/\/.*@/, '//***:***@')}`)
} else {
  env.DATABASE_URL = databaseUrl
  console.log(`Database URL: ${databaseUrl}`)
}

// Generate Prisma schema for non-MongoDB databases
if (dbType !== 'mongodb') {
  console.log(`Generating Prisma schema for ${dbType}...`)
  execSync(`node ${path.join(SCRIPTS_DIR, 'generate-schema.js')} --generate`, {
    stdio: 'inherit',
    env,
  })
} else {
  console.log('MongoDB uses separate client — skipping Prisma schema generation')
}

// Start Next.js dev server
console.log(`\nStarting dev server on port ${port} with ${dbType}...`)
execSync(`npx next dev -p ${port}`, {
  stdio: 'inherit',
  env,
})
