import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`adminUserCrud:${ip}`, rateLimits.adminUserCrud);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const { id } = await params;

    // Prevent self-deactivation
    if (id === session.userId) {
      return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await db.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, email: true, isActive: true },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: user.isActive ? "USER_DEACTIVATE" : "USER_ACTIVATE",
        entity: "User",
        entityId: id,
        details: JSON.stringify({ email: user.email }),
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    logger.error("Failed to toggle user active status", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to toggle user active status" }, { status: 500 });
  }
}
