import { NextResponse } from "next/server";
import { logger } from "./logger";

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

    // In production, don't leak internal details
    const details =
      process.env.NODE_ENV === "development" ? message : "Internal server error";

    return NextResponse.json(
      { error: "Internal server error", details },
      { status: 500 }
    );
  }
}
