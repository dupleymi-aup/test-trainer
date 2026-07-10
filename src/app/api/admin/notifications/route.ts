import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { parseRequestBody, withErrorHandler } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, getClientIp, rateLimits } from "@/lib/rate-limit";

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
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") || "20", 10), 100));
    const severity = searchParams.get("severity") || undefined;
    const type = searchParams.get("type") || undefined;
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const where: Prisma.NotificationWhereInput = {};
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
  });
}

/**
 * PATCH /api/admin/notifications/read
 * Mark one or all notifications as read.
 * Body: { ids?: string[] } — if ids is empty, marks all as read.
 */
export async function PATCH(req: NextRequest) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const ip = getClientIp(req);
    const rl = checkRateLimit("adminNotifications:" + ip, rateLimits.adminNotifications);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const bodyResult = await parseRequestBody(req, markReadSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { ids } = bodyResult.data;

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
  });
}

/**
 * POST /api/admin/notifications
 * Create a new notification (used by threshold alerts and scheduled reports).
 */
export async function POST(req: NextRequest) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const ip = getClientIp(req);
    const rl = checkRateLimit("adminNotifications:" + ip, rateLimits.adminNotifications);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const bodyResult = await parseRequestBody(req, createNotificationSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { type, severity, title, message, entity, entityId, actionUrl } = bodyResult.data;

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
  });
}

/**
 * DELETE /api/admin/notifications
 * Delete read notifications or all if ?all=true.
 */
export async function DELETE(req: NextRequest) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const ip = getClientIp(req);
    const rl = checkRateLimit("adminNotifications:" + ip, rateLimits.adminNotifications);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";

    if (all) {
      await db.notification.deleteMany({});
    } else {
      await db.notification.deleteMany({ where: { read: true } });
    }

    await db.activityLog.create({
      data: {
        userId: guard.session.userId,
        action: "NOTIFICATIONS_DELETE",
        entity: "Notification",
        details: JSON.stringify({ deleteAll: all }),
        ipAddress: getClientIp(req),
      },
    });

    return NextResponse.json({ success: true });
  });
}
