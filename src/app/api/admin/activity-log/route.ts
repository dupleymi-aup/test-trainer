import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { checkRateLimit, rateLimits, createRateLimitResponse } from "@/lib/rate-limit";
import { parseSearchParams, withErrorHandler } from "@/lib/api-error-handler";
import { paginationSchema } from "@/lib/shared-schemas";
import { z } from "zod";

const activityLogParamsSchema = paginationSchema.extend({
  action: z.string().optional(),
  userId: z.string().optional(),
});

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const rateResult = checkRateLimit(`activity-log:${session.userId}`, rateLimits.adminSettings);
    if (rateResult.limited) {
      return createRateLimitResponse(rateResult.resetAt);
    }

    const params = parseSearchParams(req, activityLogParamsSchema);
    if (!params.success) return params.errorResponse;
    const { page, limit, action, userId } = params.data;
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityLogWhereInput = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true, email: true, role: true },
          },
        },
      }),
      db.activityLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });
}
