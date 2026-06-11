import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const csrf = await requireCSRF(_req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const ip = getClientIp(_req);
    const rateLimit = checkRateLimit(`adminUserRestore:${ip}`, rateLimits.adminUserRestore);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: { deletedAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.deletedAt) {
    return NextResponse.json({ error: "User is not deleted" }, { status: 400 });
  }

  await db.user.update({
    where: { id },
    data: { deletedAt: null },
  });

  await db.activityLog.create({
    data: {
      userId: session.userId,
      action: "USER_RESTORE",
      entity: "User",
      entityId: id,
      details: JSON.stringify({ action: "restore" }),
    },
  });

  return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("user-restore-route failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
