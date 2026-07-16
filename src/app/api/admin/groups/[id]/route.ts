import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseRequestBody, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, getClientIp, rateLimits } from "@/lib/rate-limit";

const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireAdmin());
    const ip = getClientIp(req);
    const rl = checkRateLimit("adminGroupCrud:" + ip, rateLimits.adminGroupCrud);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    unwrapGuard(await requireCSRF(req));
    const { id } = await params;
    const bodyResult = await parseRequestBody(req, updateGroupSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const group = await db.group.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const updated = await db.group.update({
      where: { id },
      data: bodyResult.data,
      include: { _count: { select: { members: true } } },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "GROUP_UPDATE",
        entity: "Group",
        entityId: id,
        details: JSON.stringify(bodyResult.data),
      },
    });

    return NextResponse.json({ group: updated });
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(_req, async () => {
    const session = unwrapGuard(await requireAdmin());
    const ip = getClientIp(_req);
    const rl = checkRateLimit("adminGroupCrud:" + ip, rateLimits.adminGroupCrud);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    const csrf = await requireCSRF(_req);
    if ("response" in csrf) return csrf.response;
    const { id } = await params;
    const group = await db.group.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    await db.group.delete({ where: { id } });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "GROUP_DELETE",
        entity: "Group",
        entityId: id,
        details: JSON.stringify({ name: group.name }),
      },
    });

    return NextResponse.json({ success: true });
  });
}
