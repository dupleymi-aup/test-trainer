import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { invalidateCache, clearCache, getCacheStats } from "@/lib/analytics-cache";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { parseRequestBody, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";

const invalidateCacheSchema = z.object({
  pattern: z.string().max(200).regex(/^[a-zA-Z0-9\-_.*:]*$/).optional(),
});

export async function POST(req: NextRequest) {
  return withErrorHandler(req, async () => {
    unwrapGuard(await requireAdmin());
    unwrapGuard(await requireCSRF(req));

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`adminCacheInvalidate:${ip}`, rateLimits.adminCacheInvalidate);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const bodyResult = await parseRequestBody(req, invalidateCacheSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { pattern } = bodyResult.data;

    if (pattern) {
      const count = invalidateCache(pattern);
      return NextResponse.json({ invalidated: count, pattern });
    }

    clearCache();
    return NextResponse.json({ invalidated: "all" });
  });
}

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    unwrapGuard(await requireAdmin());
    return NextResponse.json(getCacheStats());
  });
}
