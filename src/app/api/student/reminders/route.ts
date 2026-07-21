import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { parseRequestBody, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";

const updateReminderSchema = z.object({
  reminderId: z.string().optional(),
  action: z.enum(["mark_read", "mark_all_read"]),
}).refine((data) => {
  if (data.action === "mark_read" && !data.reminderId) {
    return { error: "reminderId is required for mark_read action", path: ["reminderId"] };
  }
  return true;
});

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    const session = unwrapGuard(await requireStudent());

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
  });
}

export async function PATCH(req: Request) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireStudent());
    unwrapGuard(await requireCSRF(req));

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`studentReminders:${ip}`, rateLimits.studentReminders);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const bodyResult = await parseRequestBody(req, updateReminderSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { reminderId, action } = bodyResult.data;

    if (action === "mark_read") {
      await db.reminder.updateMany({
        where: { id: reminderId, userId: session.userId },
        data: { read: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (action === "mark_all_read") {
      await db.reminder.updateMany({
        where: { userId: session.userId, read: false },
        data: { read: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  });
}
