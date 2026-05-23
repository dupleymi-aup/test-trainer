const net = require('net')

function checkPort(host, port, timeout = 2000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port })
    let resolved = false

    socket.on('connect', () => {
      if (!resolved) {
        resolved = true
        socket.destroy()
        resolve(true)
      }
    })

    socket.on('error', () => {
      if (!resolved) {
        resolved = true
        resolve(false)
      }
    })

    setTimeout(() => {
      if (!resolved) {
        resolved = true
        socket.destroy()
        resolve(false)
      }
    }, timeout)
  })
}

async function findAvailablePort(startPort = 3000, maxAttempts = 10) {
  const port = parseInt(process.env.PORT, 10) || startPort

  for (let i = 0; i < maxAttempts; i++) {
    const testPort = port + i
    const available = await new Promise((resolve) => {
      const server = net.createServer()
      server.listen(testPort, '127.0.0.1', () => {
        server.close()
        resolve(true)
      })
      server.on('error', () => resolve(false))
      setTimeout(() => {
        server.close()
        resolve(false)
      }, 500)
    })

    if (available) return testPort
  }

  console.error('Не удалось найти свободный порт')
  process.exit(1)
}

async function detectDatabase() {
  const dbType = process.env.DB_TYPE

  if (dbType) {
    console.error(`DB_TYPE set to: ${dbType}`)
    return dbType
  }

  console.error('Auto-detecting database...')

  const pgAvailable = await checkPort('127.0.0.1', 5432)
  if (pgAvailable) {
    console.error('PostgreSQL detected on port 5432')
    return 'postgres'
  }

  const mongoAvailable = await checkPort('127.0.0.1', 27017)
  if (mongoAvailable) {
    console.error('MongoDB detected on port 27017')
    return 'mongodb'
  }

  console.error('No PostgreSQL or MongoDB detected — using SQLite (default)')
  return 'sqlite'
}

async function main() {
  const detectedDbType = await detectDatabase()
  const port = await findAvailablePort()

  let databaseUrl
  if (detectedDbType === 'postgres') {
    // Use env var only if it looks like a postgres URL, otherwise use default
    const envUrl = process.env.DATABASE_URL || ''
    databaseUrl = envUrl.startsWith('postgresql://') || envUrl.startsWith('postgres://')
      ? envUrl
      : 'postgresql://postgres:postgres@127.0.0.1:5432/testtrainer?schema=public'
  } else if (detectedDbType === 'mongodb') {
    const envUrl = process.env.MONGODB_URI || ''
    databaseUrl = envUrl.startsWith('mongodb://') || envUrl.startsWith('mongodb+srv://')
      ? envUrl
      : 'mongodb://127.0.0.1:27017/testtrainer'
  } else {
    databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'
  }

  const result = {
    dbType: detectedDbType,
    databaseUrl,
    port,
  }

  console.log(JSON.stringify(result))
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
