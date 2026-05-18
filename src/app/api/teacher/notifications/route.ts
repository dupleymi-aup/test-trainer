import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireTeacherOrAdmin();
  if ("response" in guard) return guard.response;

  const { user } = guard;

  // Get notifications for this teacher
  const notifications = await db.activityLog.findMany({
    where: {
      userId: user.id,
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
}

export async function POST(req: Request) {
  const guard = await requireTeacherOrAdmin();
  if ("response" in guard) return guard.response;

  const { user } = guard;
  const body = await req.json();
  const { type, message, studentId } = body;

  // Create notification
  const notification = await db.activityLog.create({
    data: {
      userId: user.id,
      action: `ALERT_${type}`,
      entity: "Student",
      entityId: studentId,
      details: message,
    },
  });

  return NextResponse.json({ success: true, notification });
}

export async function PATCH(req: Request) {
  const guard = await requireTeacherOrAdmin();
  if ("response" in guard) return guard.response;

  const body = await req.json();
  const { notificationId, read } = body;

  // Mark as read (in this case, we just log it)
  // Since ActivityLog doesn't have a read field, we just return success
  return NextResponse.json({ success: true });
}
