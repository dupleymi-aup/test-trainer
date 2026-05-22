import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimits, createRateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const notificationSchema = z.object({
  type: z.string().max(50).regex(/^[A-Z_]+$/, "Type must be uppercase letters and underscores only"),
  message: z.string().max(500),
  studentId: z.string().optional(),
});

export async function GET() {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;

    const { session } = guard;

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
    const unreadCount = notifications.filter(
      (n) => n.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000) // last 24 hours
    ).length;

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.action.replace("ALERT_", ""),
        message: n.details,
        createdAt: n.createdAt.toISOString(),
        read: n.createdAt < new Date(Date.now() - 24 * 60 * 60 * 1000),
      })),
      unreadCount,
    });
  } catch (error) {
    logger.error("Failed to fetch notifications", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;

    const { session } = guard;

    // Rate limit: 20 notifications per hour per teacher
    const result = checkRateLimit(`notifications:${session.userId}`, rateLimits.notifications);
    if (result.limited) {
      return createRateLimitResponse(result.resetAt);
    }

    const body = await req.json();
    const parsed = notificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { type, message, studentId } = parsed.data;

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
  } catch (error) {
    logger.error("Failed to create notification", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;

    const body = await req.json();
    const { notificationId, read } = body;

    // Mark as read (in this case, we just log it)
    // Since ActivityLog doesn't have a read field, we just return success
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to update notification", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
