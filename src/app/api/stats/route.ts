import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp, createRateLimitResponse } from "@/lib/rate-limit";
import { logApiError, apiErrorResponse } from "@/lib/api-error-handler";

const publicStatsRateLimit = { max: 30, windowMs: 60 * 1000 };

export async function GET(req: Request) {
  const ip = getClientIp(req);
  try {
    const rateLimit = checkRateLimit(`public-stats:${ip}`, publicStatsRateLimit);
    if (rateLimit.limited) return createRateLimitResponse(rateLimit.resetAt);

    const [userCount, attemptCount, groupCount] = await Promise.all([
      db.user.count({ where: { isActive: true, deletedAt: null } }),
      db.attempt.count(),
      db.group.count(),
    ]);

    return NextResponse.json({
      userCount,
      attemptCount,
      groupCount,
    });
  } catch (error) {
    logApiError("stats", error, { ip });
    return apiErrorResponse("Failed to fetch stats");
  }
}
