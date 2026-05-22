import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";

export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const groups = await db.group.findMany({
      include: {
        _count: { select: { members: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    logger.error("Failed to fetch groups", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

const createGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`adminGroupCrud:${ip}`, rateLimits.adminGroupCrud);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const body = await req.json();
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.message }, { status: 400 });
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
  } catch (error) {
    logger.error("Failed to create group", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
