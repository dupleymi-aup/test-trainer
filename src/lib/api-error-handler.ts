import { NextResponse } from "next/server";
import { logger } from "./logger";
import { z, type ZodError, type ZodSchema } from "zod";
import { randomUUID } from "node:crypto";

/**
 * Formats a Zod v4 error into a human-readable string.
 * Zod v4 changed error.message to a JSON string and moved
 * structured data to error.issues, so this helper iterates
 * over issues and joins their messages with field paths.
 */
export function formatZodError(error: ZodError): string {
  const issues = error.issues ?? [];
  if (issues.length === 0) {
    return "Validation failed";
  }
  return issues
    .map((issue) => {
      const field = issue.path?.join(".");
      return field ? `${field}: ${issue.message}` : issue.message;
    })
    .filter(Boolean)
    .join("; ");
}

/**
 * Structured log helpers for API routes that need to add
 * consistent logging without the full withErrorHandler wrapper.
 */

export function logApiError(route: string, error: unknown, extra?: Record<string, unknown>): void {
  const ctx = error instanceof Error
    ? { ...extra, name: error.name, message: error.message }
    : { ...extra, error: String(error) };
  logger.error(`[API] ${route}`, ctx);
}

export function apiErrorResponse(error: string, status = 500): NextResponse<{ error: string }> {
  return NextResponse.json({ error }, { status });
}

/**
 * Validate API response data against a Zod schema before sending.
 * In development, throws on mismatch. In production, logs a warning.
 * Usage:
 *   return validateApiResponse(studentAnalyticsResponseSchema, { attempts: 5, ... });
 */
export function validateApiResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${String(issue.path?.join(".") ?? "")}: ${issue.message}`)
      .join("; ");
    const msg = `API response validation failed: ${issues}`;
    throw new AppError(500, msg);
  }
  return result.data;
}

/**
 * Maximum allowed request body size in bytes (1 MB).
 */
const MAX_BODY_SIZE = 1 * 1024 * 1024;

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Returns the parsed data or an error response for the route to return.
 * Usage:
 *   const body = await parseRequestBody(req, schema);
 *   if (!body.success) return body.errorResponse;
 *   const { title, content } = body.data;
 */
export async function parseRequestBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<
  | { success: true; data: T }
  | { success: false; errorResponse: NextResponse<{ error: string }> }
> {
  try {
    // Pre-check with Content-Length header (fast path, may be absent)
    const contentLength = req.headers.get("content-length");
    if (contentLength) {
      const len = parseInt(contentLength, 10);
      if (Number.isFinite(len) && len > MAX_BODY_SIZE) {
      return {
        success: false,
        errorResponse: NextResponse.json(
          { error: "Request body too large (max 1MB)" },
          { status: 413 }
        ),
      };
    }
    const json = await req.json();
    // Post-check: serialize to catch oversized payloads that bypassed Content-Length
    const serialized = JSON.stringify(json);
    if (serialized.length > MAX_BODY_SIZE) {
      return {
        success: false,
        errorResponse: NextResponse.json(
          { error: "Request body too large (max 1MB)" },
          { status: 413 }
        ),
      };
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return {
        success: false,
        errorResponse: NextResponse.json(
          { error: formatZodError(parsed.error) },
          { status: 400 }
        ),
      };
    }
    return { success: true, data: parsed.data };
  } catch {
    return {
      success: false,
      errorResponse: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }
}

/**
 * Parse and validate URL search params against a Zod schema.
 * Returns the parsed data or an error response for the route to return.
 * Usage:
 *   const params = parseSearchParams(req, schema);
 *   if (!params.success) return params.errorResponse;
 *   const { groupId, dateFrom } = params.data;
 */
export function parseSearchParams<T>(
  req: Request,
  schema: ZodSchema<T>
):
  | { success: true; data: T }
  | { success: false; errorResponse: NextResponse<{ error: string }> } {
  const { searchParams } = new URL(req.url);
  const raw: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errorResponse: NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: parsed.data };
}

/**
 * Unwrap a guard result (auth, CSRF, etc.) and throw AppError on failure.
 * Use inside withErrorHandler to eliminate boilerplate:
 *
 *   const auth = unwrapGuard(await requireAuth());
 *   // auth is AuthSession, use auth.userId instead of auth.session.userId
 *
 *   unwrapGuard(await requireCSRF(req), 403, "CSRF token missing or invalid");
 *
 * Throws AppError with the given status and message when "response" is present.
 */
export function unwrapGuard<T>(
  result: { session: T } | { verified: true } | { response: Response },
  status?: number,
  message?: string
): T {
  if ("response" in result) {
    const res = result.response;
    const inferredStatus = status ?? res.status;
    const inferredMessage = message ??
      (res.status === 401 ? "Unauthorized" :
       res.status === 403 ? "Forbidden" :
       res.status === 404 ? "Not found" :
       "Request failed");
    throw new AppError(inferredStatus, inferredMessage);
  }
  return (result as { session: T }).session;
}

/**
 * Unwrap a teacher-group guard result and throw AppError on failure.
 * Like unwrapGuard but extracts the `group` property instead of `session`.
 */
export function unwrapGroupGuard(
  result: { group: { id: string; createdByUserId: string } } | { response: Response },
  status?: number,
  message?: string
): { id: string; createdByUserId: string } {
  if ("response" in result) {
    const res = result.response;
    const inferredStatus = status ?? res.status;
    const inferredMessage = message ??
      (res.status === 401 ? "Unauthorized" :
       res.status === 403 ? "Forbidden" :
       res.status === 404 ? "Not found" :
       "Request failed");
    throw new AppError(inferredStatus, inferredMessage);
  }
  return result.group;
}

/**
 * Application-level error with an associated HTTP status code.
 * Throw this from within a withErrorHandler to get a non-500 response.
 *
 * Usage:
 *   throw new AppError(400, "Invalid or expired token");
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

/**
 * Wraps an API route handler with try/catch error handling.
 * Returns a JSON error response with status 500 on failure.
 *
 * Usage:
 *   export async function GET(req: Request) {
 *     return withErrorHandler(req, async () => {
 *       // ... your code
 *       return NextResponse.json({ data });
 *     });
 *   }
 *
 * Known errors thrown as AppError(code, message) preserve their status.
 * All other errors return 500 with the error message.
 */
export async function withErrorHandler(
  req: Request | undefined,
  handler: () => Promise<Response>
): Promise<Response> {
  const startTime = Date.now();
  const requestId = req?.headers.get("x-request-id") ?? randomUUID();
  const method = req?.method ?? "GET";
  const path = req ? new URL(req.url).pathname : "unknown";

  try {
    const response = await handler();
    const duration = Date.now() - startTime;
    const logCtx = { method, path, status: response.status, duration, requestId };
    if (duration > 2000) {
      logger.warn("Slow API response", logCtx);
    } else {
      logger.info("API response", logCtx);
    }
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = error instanceof AppError ? error.statusCode : 500;

    logger.error("API response error", { method, path, status, duration, requestId, message });

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: message, details: process.env.NODE_ENV === "development" ? message : undefined },
        { status }
      );
    }

    logger.error("[API Error]", error instanceof Error ? error : undefined);

    return NextResponse.json(
      { error: "Internal server error", details: process.env.NODE_ENV === "development" ? message : undefined },
      { status }
    );
  }
}
