import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { parseRequestBody, withErrorHandler } from "@/lib/api-error-handler";

const changeRoleSchema = z.object({
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`adminRoleChange:${ip}`, rateLimits.adminRoleChange);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const { id } = await params;
    const bodyResult = await parseRequestBody(req, changeRoleSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await db.user.update({
      where: { id },
      data: { role: bodyResult.data.role, lastSessionInvalidation: new Date() },
      select: { id: true, name: true, email: true, role: true },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "ROLE_CHANGE",
        entity: "User",
        entityId: id,
        details: JSON.stringify({ from: user.role, to: bodyResult.data.role }),
      },
    });

    return NextResponse.json({ user: updated });
  });
}
