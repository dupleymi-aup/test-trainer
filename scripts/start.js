/**
 * Cross-platform start script for production server
 *
 * Replaces Unix-only inline env assignment (NODE_ENV=production)
 * and tee command with Node.js native process spawning.
 */

const { spawn } = require("child_process");
const path = require("path");

const serverPath = path.join(".next", "standalone", "server.js");
const logPath = "server.log";

process.env.NODE_ENV = "production";

console.log("[start] Starting production server...");
console.log(`[start] Log file: ${logPath}`);

const server = spawn("bun", [serverPath], {
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env,
});

// Write stdout and stderr to log file and console
const fs = require("fs");
const logStream = fs.createWriteStream(logPath, { flags: "a" });

server.stdout.on("data", (data) => {
  process.stdout.write(data);
  logStream.write(data);
});

server.stderr.on("data", (data) => {
  process.stderr.write(data);
  logStream.write(data);
});

server.on("close", (code) => {
  console.log(`[start] Server exited with code ${code}`);
  process.exit(code ?? 1);
});

process.on("SIGINT", () => {
  console.log("[start] Shutting down...");
  server.kill("SIGINT");
});

process.on("SIGTERM", () => {
  console.log("[start] Shutting down...");
  server.kill("SIGTERM");
});
