import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { withErrorHandler } from "@/lib/api-error-handler";
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
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const ip = getClientIp(req);
    const rl = checkRateLimit("teacherGroupCrud:" + ip, rateLimits.teacherGroupCrud);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = updateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details:(parsed.error) }, { status: 400 });
    }

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
      data: parsed.data,
      include: { _count: { select: { members: true } } },
    });

    return NextResponse.json({ group: updated });
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(_req, async () => {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const ip = getClientIp(_req);
    const rl = checkRateLimit("teacherGroupCrud:" + ip, rateLimits.teacherGroupCrud);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    const csrf = await requireCSRF(_req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

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
        ipAddress: getClientIp(_req),
      },
    });

    return NextResponse.json({ success: true });
  });
}
