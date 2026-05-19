import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Get all unread reminders for this student
  const reminders = await db.reminder.findMany({
    where: { userId: session.user.id },
    include: {
      deadline: {
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          type: true,
          taskId: true,
          group: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { deadline: { dueDate: "asc" } },
  });

  // Separate upcoming and overdue
  const upcoming = reminders.filter((r) => !r.read && r.deadline.dueDate >= now);
  const overdue = reminders.filter((r) => !r.read && r.deadline.dueDate < now);

  // Upcoming deadlines (next 7 days)
  const nextWeek = upcoming.filter((r) => r.deadline.dueDate <= sevenDaysFromNow);

  return NextResponse.json({
    reminders: reminders.map((r) => ({
      ...r,
      deadline: { ...r.deadline, dueDate: r.deadline.dueDate.toISOString() },
    })),
    upcoming,
    overdue,
    nextWeek,
    counts: {
      total: reminders.length,
      unread: reminders.filter((r) => !r.read).length,
      overdue: overdue.length,
      nextWeek: nextWeek.length,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { reminderId, action } = body;

  if (action === "mark_read") {
    await db.reminder.updateMany({
      where: { id: reminderId, userId: session.user.id },
      data: { read: true, readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "mark_all_read") {
    await db.reminder.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true, readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
