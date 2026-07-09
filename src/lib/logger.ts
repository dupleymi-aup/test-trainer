/**
 * Lightweight structured logger for server-side API routes.
 *
 * Provides timestamped JSON-structured log output.
 * In production, replace with a proper logger (pino, winston, Sentry).
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.error("Failed to fetch users", { userId, error });
 *   logger.warn("Rate limit approaching", { ip, remaining });
 *   logger.info("User created", { userId });
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

function getLogLevel(): number {
  switch (process.env.LOG_LEVEL) {
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
