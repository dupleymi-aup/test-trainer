import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Заголовок обязателен").max(200),
  content: z.string().min(1, "Содержание обязательно").max(5000),
  groupId: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    const where: Record<string, unknown> = {};

    if (groupId) {
      where.groupId = groupId;
    } else {
      // Show announcements for groups the teacher owns + system-wide
      const groups = await db.group.findMany({
        where: { createdByUserId: session.userId },
        select: { id: true },
      });
      const groupIds = groups.map((g) => g.id);
      where.OR = [{ groupId: { in: groupIds } }, { groupId: null }];
    }

    const announcements = await db.announcement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        group: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    logger.error("Failed to fetch announcements", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const parsed = createAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
    }

    const { title, content, groupId, expiresAt } = parsed.data;

    // Verify teacher owns the group (admins can post to any group)
    if (groupId && session.role !== "ADMIN") {
      const group = await db.group.findUnique({
        where: { id: groupId },
        select: { createdByUserId: true },
      });
      if (!group || group.createdByUserId !== session.userId) {
        return NextResponse.json({ error: "You can only post announcements to your own groups" }, { status: 403 });
      }
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        groupId: groupId || null,
        createdById: session.userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        group: { select: { id: true, name: true } },
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "ANNOUNCEMENT_CREATE",
        entity: "Announcement",
        entityId: announcement.id,
        details: JSON.stringify({ title, groupId }),
      },
    });

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create announcement", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing announcement ID" }, { status: 400 });

    const announcement = await db.announcement.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!announcement) return NextResponse.json({ error: "Announcement not found" }, { status: 404 });

    // Only creator or admin can delete
    if (announcement.createdById !== session.userId && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.announcement.delete({ where: { id } });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "ANNOUNCEMENT_DELETE",
        entity: "Announcement",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete announcement", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}

const updateAnnouncementSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  expiresAt: z.string().nullable().optional(),
});

export async function PATCH(req: Request) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const parsed = updateAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
    }

    const { id, title, content, expiresAt } = parsed.data;

    const announcement = await db.announcement.findUnique({
      where: { id },
      select: { createdById: true, groupId: true },
    });

    if (!announcement) return NextResponse.json({ error: "Announcement not found" }, { status: 404 });

    if (announcement.createdById !== session.userId && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
      include: {
        group: { select: { id: true, name: true } },
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "ANNOUNCEMENT_UPDATE",
        entity: "Announcement",
        entityId: id,
      },
    });

    return NextResponse.json({ announcement: updated });
  } catch (error) {
    logger.error("Failed to update announcement", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}
