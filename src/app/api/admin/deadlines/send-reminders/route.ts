import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// Send reminders for deadlines approaching within the specified hours
export async function POST(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const { searchParams } = new URL(req.url);
    const hoursAhead = parseInt(searchParams.get("hoursAhead") || "48");

    const now = new Date();
    const deadline = new Date(now);
    deadline.setHours(deadline.getHours() + hoursAhead);

    // Find deadlines within the window
    const upcomingDeadlines = await db.deadline.findMany({
      where: {
        dueDate: { gte: now, lte: deadline },
      },
      include: {
        reminders: {
          where: { sent: false },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    let sentCount = 0;

    for (const dl of upcomingDeadlines) {
      for (const reminder of dl.reminders) {
        // In a real app, send email/SMS here
        // For now, just mark as sent
        await db.reminder.update({
          where: { id: reminder.id },
          data: { sent: true, sentAt: new Date() },
        });
        sentCount++;
      }
    }

    // Also find overdue deadlines with unsent reminders
    const overdueDeadlines = await db.deadline.findMany({
      where: { dueDate: { lt: now } },
      include: {
        reminders: {
          where: { sent: false },
        },
      },
    });

    for (const dl of overdueDeadlines) {
      for (const reminder of dl.reminders) {
        await db.reminder.update({
          where: { id: reminder.id },
          data: { sent: true, sentAt: new Date() },
        });
        sentCount++;
      }
    }

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "REMINDERS_SENT",
        entity: "Reminder",
        details: JSON.stringify({ sentCount, hoursAhead }),
      },
    });

    logger.info(`Sent ${sentCount} reminders for deadlines within ${hoursAhead}h`);

    return NextResponse.json({ sentCount, hoursAhead });
  } catch (error) {
    logger.error("Failed to send reminders", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
