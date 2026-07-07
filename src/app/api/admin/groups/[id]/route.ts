import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
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
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const ip = getClientIp(req);
    const rl = checkRateLimit("adminGroupCrud:" + ip, rateLimits.adminGroupCrud);
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

    const group = await db.group.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const updated = await db.group.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { members: true } } },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "GROUP_UPDATE",
        entity: "Group",
        entityId: id,
        details: JSON.stringify(parsed.data),
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
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const ip = getClientIp(_req);
    const rl = checkRateLimit("adminGroupCrud:" + ip, rateLimits.adminGroupCrud);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    const csrf = await requireCSRF(_req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

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
