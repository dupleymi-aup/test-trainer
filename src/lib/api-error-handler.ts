import { NextResponse } from "next/server";
import { logger } from "./logger";
import type { ZodError, ZodSchema } from "zod";

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
    const json = await req.json();
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
 */
export async function withErrorHandler<T>(
  _req: Request,
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | { error: string; details?: string }>> {
  try {
    return await handler();
  } catch (error) {
    logger.error("[API Error]", error instanceof Error ? error : undefined);

    const message = error instanceof Error ? error.message : "Internal server error";

    const details =
      process.env.NODE_ENV === "development" ? message : "Internal server error";

    return NextResponse.json(
      { error: "Internal server error", details },
      { status: 500 }
    );
  }
}
