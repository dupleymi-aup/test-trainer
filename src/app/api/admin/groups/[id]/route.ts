import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const { id } = await params;
    const body = await req.json();
    const parsed = updateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.errors }, { status: 400 });
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
  } catch (error) {
    logger.error("Failed to update group", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
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
  } catch (error) {
    logger.error("Failed to delete group", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
