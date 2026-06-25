import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { formatZodError, withErrorHandler } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    // Rate limiting for expensive read operation
    const rateResult = checkRateLimit(`adminGroups:${session.userId}`, rateLimits.adminGroupCrud);
    if (rateResult.limited) {
      return createRateLimitResponse(rateResult.resetAt);
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
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
  name: z.string().min(1, "Название обязательно").max(100, "Название слишком длинное"),
  description: z.string().max(500, "Описание слишком длинное").optional(),
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

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: formatZodError(parsed.error) }, { status: 400 });
    }

    const group = await db.group.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
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
