import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimits, createRateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";
import { parseRequestBody, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";

const notificationSchema = z.object({
  type: z.string().max(50).regex(/^[A-Z_]+$/, "Type must be uppercase letters and underscores only"),
  message: z.string().max(500),
  studentId: z.string().optional(),
});

const updateNotificationSchema = z.object({
  notificationId: z.string(),
  read: z.boolean(),
});

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    const session = unwrapGuard(await requireTeacherOrAdmin());

    // Get notifications for this teacher
    const notifications = await db.activityLog.findMany({
      where: {
        userId: session.userId,
        action: { startsWith: "ALERT_" },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Count unread (all notifications from last 7 days are considered "new")
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const unreadCount = notifications.filter(
      (n) => n.createdAt > twentyFourHoursAgo // last 24 hours
    ).length;

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.action.replace("ALERT_", ""),
        message: n.details,
        createdAt: n.createdAt.toISOString(),
        read: n.createdAt < twentyFourHoursAgo,
      })),
      unreadCount,
    });
  });
}

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireTeacherOrAdmin());
    unwrapGuard(await requireCSRF(req));
    // Rate limit: 20 notifications per hour per teacher
    const result = checkRateLimit(`notifications:${session.userId}`, rateLimits.notifications);
    if (result.limited) {
      return createRateLimitResponse(result.resetAt);
    }

    const bodyResult = await parseRequestBody(req, notificationSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { type, message, studentId } = bodyResult.data;

    // Create notification
    const notification = await db.activityLog.create({
      data: {
        userId: session.userId,
        action: `ALERT_${type}`,
        entity: "Student",
        entityId: studentId,
        details: message,
      },
    });

    return NextResponse.json({ success: true, notification });
  });
}

export async function PATCH(req: Request) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireTeacherOrAdmin());
    unwrapGuard(await requireCSRF(req));
    const bodyResult = await parseRequestBody(req, updateNotificationSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { notificationId, read } = bodyResult.data;

    if (!read) {
      return NextResponse.json({ error: "Only mark-as-read is supported" }, { status: 400 });
    }

    // Mark as read by deleting the notification (read = dismissed)
    // Verify ownership so teachers can only dismiss their own notifications
    const deleted = await db.activityLog.deleteMany({
      where: {
        id: notificationId,
        userId: session.userId,
        action: { startsWith: "ALERT_" },
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  });
}
