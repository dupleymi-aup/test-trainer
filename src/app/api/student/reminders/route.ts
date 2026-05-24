import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";

const updateReminderSchema = z.object({
  reminderId: z.string().optional(),
  action: z.enum(["mark_read", "mark_all_read"]),
}).refine((data) => {
  if (data.action === "mark_read" && !data.reminderId) {
    return { error: "reminderId is required for mark_read action", path: ["reminderId"] };
  }
  return true;
});

export async function GET() {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const reminders = await db.reminder.findMany({
      where: { userId: session.userId },
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

    const upcoming = reminders.filter((r) => !r.read && r.deadline.dueDate >= now);
    const overdue = reminders.filter((r) => !r.read && r.deadline.dueDate < now);
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
  } catch (error) {
    logger.error("Failed to fetch reminders", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`studentReminders:${ip}`, rateLimits.studentReminders);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const body = await req.json();
    const parsed = updateReminderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.message },
        { status: 400 }
      );
    }

    const { reminderId, action } = parsed.data;

    if (action === "mark_read") {
      await db.reminder.updateMany({
        where: { id: reminderId, userId: session.userId },
        data: { read: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "mark_all_read") {
      await db.reminder.updateMany({
        where: { userId: session.userId, read: false },
        data: { read: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("Failed to update reminders", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to update reminders" }, { status: 500 });
  }
}
