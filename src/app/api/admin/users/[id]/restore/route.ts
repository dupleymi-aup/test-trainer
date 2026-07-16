import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireAdmin());
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const ip = getClientIp(req);
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
      data: { deletedAt: null, lastSessionInvalidation: new Date() },
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
  });
}
