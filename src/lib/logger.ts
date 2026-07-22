/**
 * Structured logger for server-side API routes and client-side error logging.
 *
 * Provides timestamped JSON-structured log output.
 * In production, replace with a proper logger (pino, winston, Sentry).
 *
 * Usage (server):
 *   import { logger } from "@/lib/logger";
 *   logger.error("Failed to fetch users", { userId, error });
 *
 * Usage (client):
 *   import { logClientError } from "@/lib/logger";
 *   logClientError("[ComponentName]", error);
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let _cachedLevel: number | null = null;
let _cachedEnvValue: string | undefined = undefined;
const CACHE_TTL_MS = 5_000; // Re-read env var every 5 seconds
let _cacheTimestamp = 0;

function getLogLevel(): number {
  const currentEnv = process.env.LOG_LEVEL;
  const now = Date.now();
  if (
    _cachedLevel === null ||
    currentEnv !== _cachedEnvValue ||
    now - _cacheTimestamp > CACHE_TTL_MS
  ) {
    _cachedLevel = parseLogLevel(currentEnv);
    _cachedEnvValue = currentEnv;
    _cacheTimestamp = now;
  }
  return _cachedLevel;
}

function parseLogLevel(value: string | undefined): number {
  switch (value) {
    case "error": return LOG_LEVELS.error;
    case "warn": return LOG_LEVELS.warn;
    case "info": return LOG_LEVELS.info;
    case "debug": return LOG_LEVELS.debug;
    default: return LOG_LEVELS.info;
  }
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= getLogLevel();
}

function formatLog(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
  };
  return JSON.stringify(entry);
}

function extractErrorContext(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { error: String(error) };
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (!shouldLog("debug")) return;
    console.debug(formatLog("debug", message, context));
  },

  info(message: string, context?: Record<string, unknown>) {
    if (!shouldLog("info")) return;
    console.info(formatLog("info", message, context));
  },

  warn(message: string, context?: Record<string, unknown>) {
    if (!shouldLog("warn")) return;
    console.warn(formatLog("warn", message, context));
  },

  error(message: string, errorOrContext?: Record<string, unknown> | Error) {
    if (!shouldLog("error")) return;
    const context =
      errorOrContext instanceof Error
        ? extractErrorContext(errorOrContext)
        : errorOrContext;
    console.error(formatLog("error", message, context));
  },
};

/**
 * Client-side error logger. Wraps console.error with structured output.
 * Use in React components where the server logger is not available.
 */
export function logClientError(tag: string, error?: unknown) {
  const context = error instanceof Error ? extractErrorContext(error) : error ? { error: String(error) } : undefined;
  console.error(formatLog("error", tag, context));
}
