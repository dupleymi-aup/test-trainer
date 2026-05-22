import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { z } from "zod";

const createNotificationSchema = z.object({
  type: z.string().max(100),
  severity: z.string().max(50),
  title: z.string().max(200),
  message: z.string().max(2000).optional().nullable(),
  entity: z.string().max(100).optional().nullable(),
  entityId: z.string().max(100).optional().nullable(),
  actionUrl: z.string().max(500).optional().nullable(),
});

const markReadSchema = z.object({
  ids: z.array(z.string()).optional(),
});

/**
 * GET /api/admin/notifications
 * Returns paginated notifications with optional filters.
 */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const severity = searchParams.get("severity") || undefined;
    const type = searchParams.get("type") || undefined;
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity;
    if (type) where.type = type;
    if (unreadOnly) where.read = false;

    const [total, notifications] = await Promise.all([
      db.notification.count({ where }),
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      notifications,
      pagination: { page, limit, total, totalPages },
      unreadCount: unreadOnly
        ? total
        : await db.notification.count({ where: { read: false } }),
    });
  } catch (error) {
    logger.error("Failed to fetch notifications", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/notifications/read
 * Mark one or all notifications as read.
 * Body: { ids?: string[] } — if ids is empty, marks all as read.
 */
export async function PATCH(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const body = await req.json().catch(() => ({}));
    const parsed = markReadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.message },
        { status: 400 }
      );
    }

    const { ids } = parsed.data;

    if (ids && ids.length > 0) {
      await db.notification.updateMany({
        where: { id: { in: ids }, read: false },
        data: { read: true, readAt: new Date() },
      });
    } else {
      await db.notification.updateMany({
        where: { read: false },
        data: { read: true, readAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to mark notifications as read", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}

/**
 * POST /api/admin/notifications
 * Create a new notification (used by threshold alerts and scheduled reports).
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const body = await req.json();
    const parsed = createNotificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.message },
        { status: 400 }
      );
    }

    const { type, severity, title, message, entity, entityId, actionUrl } = parsed.data;

    const notification = await db.notification.create({
      data: {
        type,
        severity,
        title,
        message: message || null,
        entity: entity || null,
        entityId: entityId || null,
        actionUrl: actionUrl || null,
      },
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create notification", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/notifications
 * Delete read notifications or all if ?all=true.
 */
export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";

    if (all) {
      await db.notification.deleteMany({});
    } else {
      await db.notification.deleteMany({ where: { read: true } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete notifications", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 });
  }
}
