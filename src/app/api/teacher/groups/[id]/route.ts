import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
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
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const { id } = await params;
    const body = await req.json();
    const parsed = updateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.message }, { status: 400 });
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
  } catch (error) {
    logger.error("Teacher group PATCH failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
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

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Teacher group DELETE failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
