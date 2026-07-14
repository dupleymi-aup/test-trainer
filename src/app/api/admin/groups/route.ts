import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseRequestBody, withErrorHandler } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    // Rate limiting for read operation (separate bucket from write)
    const rateResult = checkRateLimit(`adminGroupRead:${session.userId}`, rateLimits.adminGroupRead);
    if (rateResult.limited) {
      return createRateLimitResponse(rateResult.resetAt);
    }

    const { searchParams } = new URL(req.url);
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20, 100);
    const skip = (page - 1) * limit;

    const [groups, total] = await Promise.all([
      db.group.findMany({
        skip,
        take: limit,
        include: {
          _count: { select: { members: true } },
          createdBy: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.group.count(),
    ]);

    return NextResponse.json({
      groups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, { status: 200 });
  });
}

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`adminGroupCrud:${ip}`, rateLimits.adminGroupCrud);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const bodyResult = await parseRequestBody(req, createGroupSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const group = await db.group.create({
      data: {
        name: bodyResult.data.name,
        description: bodyResult.data.description,
        createdByUserId: session.userId,
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "GROUP_CREATE",
        entity: "Group",
        entityId: group.id,
        details: JSON.stringify({ name: group.name }),
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  });
}
