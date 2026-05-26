/**
 * Cross-platform start script for production server
 *
 * Auto-detects database type, generates Prisma schema, and starts the server.
 * Replaces Unix-only inline env assignment (NODE_ENV=production)
 * and tee command with Node.js native process spawning.
 */

const { spawn, execSync } = require("child_process")
const path = require("path")
const fs = require("fs")

const serverPath = path.join(".next", "standalone", "server.js")
const logPath = "server.log"
const SCRIPTS_DIR = path.resolve(__dirname)

process.env.NODE_ENV = "production"

console.log("[start] Starting production server...")
console.log(`[start] Log file: ${logPath}`)

// Auto-detect database if not explicitly set
if (!process.env.DB_TYPE) {
  console.log("[start] Auto-detecting database...")
  try {
    const detectOutput = execSync(`node ${path.join(SCRIPTS_DIR, 'find-db.js')}`, {
      encoding: "utf8",
      env: process.env,
    }).trim()
    const dbConfig = JSON.parse(detectOutput)

    process.env.DB_TYPE = dbConfig.dbType
    if (dbConfig.dbType === "mongodb") {
      process.env.MONGODB_URI = dbConfig.databaseUrl
    } else {
      process.env.DATABASE_URL = dbConfig.databaseUrl
    }

    console.log(`[start] Database: ${dbConfig.dbType}`)
  } catch (e) {
    console.log("[start] Database detection failed, using defaults")
  }
}

// Generate Prisma schema for non-MongoDB
const dbType = process.env.DB_TYPE || "sqlite"
if (dbType !== "mongodb") {
  console.log(`[start] Generating Prisma schema for ${dbType}...`)
  try {
    execSync(`node ${path.join(SCRIPTS_DIR, 'generate-schema.js')} --generate`, {
      stdio: "inherit",
      env: process.env,
    })
  } catch (e) {
    console.error(`[start] Failed to generate Prisma schema for ${dbType}`)
    process.exit(1)
  }
}

const server = spawn("node", [serverPath], {
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env,
})

const logStream = fs.createWriteStream(logPath, { flags: "a" })

server.stdout.on("data", (data) => {
  process.stdout.write(data)
  logStream.write(data)
})

server.stderr.on("data", (data) => {
  process.stderr.write(data)
  logStream.write(data)
})

server.on("close", (code) => {
  console.log(`[start] Server exited with code ${code}`)
  process.exit(code ?? 1)
})

process.on("SIGINT", () => {
  console.log("[start] Shutting down...")
  server.kill("SIGINT")
})

process.on("SIGTERM", () => {
  console.log("[start] Shutting down...")
  server.kill("SIGTERM")
})
