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

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
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
  info(message: string, context?: Record<string, unknown>) {
    if (process.env.LOG_LEVEL === "silent") return;
    console.info(formatLog("info", message, context));
  },

  warn(message: string, context?: Record<string, unknown>) {
    if (process.env.LOG_LEVEL === "silent" || process.env.LOG_LEVEL === "error") return;
    console.warn(formatLog("warn", message, context));
  },

  error(message: string, errorOrContext?: Record<string, unknown> | Error) {
    if (process.env.LOG_LEVEL === "silent") return;
    const context =
      errorOrContext instanceof Error
        ? extractErrorContext(errorOrContext)
        : errorOrContext;
    console.error(formatLog("error", message, context));
  },
};
