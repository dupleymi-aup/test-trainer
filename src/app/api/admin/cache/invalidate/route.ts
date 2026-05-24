import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { invalidateCache, clearCache, getCacheStats } from "@/lib/analytics-cache";
import { logger } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { formatZodError } from "@/lib/api-error-handler";

const invalidateCacheSchema = z.object({
  pattern: z.string().max(200).regex(/^[a-zA-Z0-9\-_.*:]*$/).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`adminCacheInvalidate:${ip}`, rateLimits.adminCacheInvalidate);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = invalidateCacheSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { pattern } = parsed.data;

    if (pattern) {
      const count = invalidateCache(pattern);
      return NextResponse.json({ invalidated: count, pattern });
    }

    clearCache();
    return NextResponse.json({ invalidated: "all" });
  } catch (error) {
    logger.error("Failed to invalidate cache", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to invalidate cache" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    return NextResponse.json(getCacheStats());
  } catch (error) {
    logger.error("Failed to get cache stats", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to get cache stats" }, { status: 500 });
  }
}
