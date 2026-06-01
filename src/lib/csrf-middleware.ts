/**
 * Server-side CSRF verification middleware.
 *
 * Protects state-changing routes (POST/PUT/DELETE/PATCH) from CSRF attacks
 * by verifying the Double Submit Cookie pattern token.
 *
 * Usage in API routes:
 *   import { requireCSRF } from "@/lib/csrf-middleware";
 *
 *   export async function POST(req: Request) {
 *     const csrfResult = await requireCSRF(req);
 *     if ("response" in csrfResult) return csrfResult.response;
 *     // ... continue with handler logic
 *   }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyCSRFToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/csrf";

type CSRFResult = { verified: true } | { response: NextResponse };

/**
 * Parse a specific cookie value from the Cookie header.
 */
function getCookieFromHeader(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return undefined;
  for (const pair of cookieHeader.split(";")) {
    const [key, ...rest] = pair.split("=");
    if (key.trim() === name) {
      return decodeURIComponent(rest.join("=").trim());
    }
  }
  return undefined;
}

/**
 * Verify CSRF token for state-changing requests.
 *
 * - GET and HEAD requests are always allowed (safe methods).
 * - Unauthenticated requests pass through (auth guard should handle them separately).
 * - Authenticated POST/PUT/DELETE/PATCH requests MUST have a valid CSRF token.
 */
export async function requireCSRF(req: Request): Promise<CSRFResult> {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return { verified: true };
  }

  // Check if user is authenticated — if not, let the auth guard handle it
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { verified: true };
  }

  const cookieToken = getCookieFromHeader(req, CSRF_COOKIE_NAME);
  const headerToken = req.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return {
      response: NextResponse.json(
        { error: "CSRF token missing" },
        { status: 403 }
      ),
    };
  }

  if (!verifyCSRFToken(cookieToken, headerToken)) {
    return {
      response: NextResponse.json(
        { error: "CSRF token verification failed" },
        { status: 403 }
      ),
    };
  }

  return { verified: true };
}
