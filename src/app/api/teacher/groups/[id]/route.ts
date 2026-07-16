import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
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
    const session = unwrapGuard(await requireTeacherOrAdmin());
    const ip = getClientIp(req);
    const rl = checkRateLimit("teacherGroupCrud:" + ip, rateLimits.teacherGroupCrud);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    unwrapGuard(await requireCSRF(req));
    const { id } = await params;
    const bodyResult = await parseRequestBody(req, updateGroupSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const group = await db.group.findUnique({ where: { id }, select: { createdByUserId: true } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Only group creator or admin can modify
    if (session.role !== "ADMIN" && group.createdByUserId !== session.userId) {
      return NextResponse.json({ error: "Forbidden: you can only edit your own groups" }, { status: 403 });
    }

    const updated = await db.group.update({
      where: { id },
      data: bodyResult.data,
      include: { _count: { select: { members: true } } },
    });

    return NextResponse.json({ group: updated });
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireTeacherOrAdmin());
    const ip = getClientIp(req);
    const rl = checkRateLimit("teacherGroupCrud:" + ip, rateLimits.teacherGroupCrud);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const { id } = await params;
    const group = await db.group.findUnique({ where: { id }, select: { createdByUserId: true, name: true } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Only group creator or admin can delete
    if (session.role !== "ADMIN" && group.createdByUserId !== session.userId) {
      return NextResponse.json({ error: "Forbidden: you can only delete your own groups" }, { status: 403 });
    }

    await db.group.delete({ where: { id } });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "GROUP_DELETE",
        entity: "Group",
        entityId: id,
        details: JSON.stringify({ name: group.name }),
        ipAddress: getClientIp(req),
      },
    });

    return NextResponse.json({ success: true });
  });
}
