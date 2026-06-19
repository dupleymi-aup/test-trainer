import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendDeadlineReminders } from "@/lib/reminder-dispatch";
import { secureCompare } from "@/lib/crypto";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { parseSearchParams } from "@/lib/api-error-handler";
import { z } from "zod";

const sendRemindersParamsSchema = z.object({
  hoursAhead: z.coerce.number().int().min(1).max(168).default(48),
  force: z.enum(["true", "false"]).default("false"),
});

// Send reminders for deadlines approaching within the specified hours
export async function POST(req: Request) {
  try {
    // Support both admin session (manual trigger) and cron secret (automated)
    let userId: string | null = null;

    // Try cron secret first using constant-time comparison to prevent timing attacks
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ") && process.env.CRON_SECRET) {
      if (secureCompare(authHeader.slice(7), process.env.CRON_SECRET)) {
        userId = null; // system operation, no real user
      }
    }

    // Fall back to admin auth
    if (!userId) {
      const guard = await requireAdmin();
      if ("response" in guard) return guard.response;
      const csrf = await requireCSRF(req);
      if ("response" in csrf) return csrf.response;
      userId = guard.session.userId;
    }

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`adminDeadlineSendReminders:${ip}`, rateLimits.adminDeadlineSendReminders);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const params = parseSearchParams(req, sendRemindersParamsSchema);
    if (!params.success) return params.errorResponse;
    const { hoursAhead, force: forceSend } = params.data;

    let result;

    if (forceSend) {
      // Force-send ALL unsent reminders regardless of schedule (legacy behavior)
      result = await forceSendAllReminders(hoursAhead);
    } else {
      // Use the new dispatch service with schedule-aware sending
      result = await sendDeadlineReminders();
    }

    await db.activityLog.create({
      data: {
        userId,
        action: "REMINDERS_SENT",
        entity: "Reminder",
        details: JSON.stringify({ ...result, hoursAhead, forceSend }),
      },
    });

    logger.info(
      `Sent ${result.sentCount} reminders (${result.failedCount} failed)`
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to send reminders", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}

/**
 * Legacy: force-send all unsent reminders within the time window.
 * Used when admin clicks "Send reminders" with force=true.
 */
async function forceSendAllReminders(hoursAhead: number) {
  const now = new Date();
  const window = new Date(now);
  window.setHours(window.getHours() + hoursAhead);

  const upcomingDeadlines = await db.deadline.findMany({
    where: { dueDate: { gte: now, lte: window } },
    include: {
      reminders: {
        where: { sent: false },
        include: { user: { select: { id: true, name: true, email: true, phone: true, notificationPreferences: true } } },
      },
    },
  });

  const overdueDeadlines = await db.deadline.findMany({
    where: { dueDate: { lt: now } },
    include: {
      reminders: {
        where: { sent: false },
        include: { user: { select: { id: true, name: true, email: true, phone: true, notificationPreferences: true } } },
      },
    },
  });

  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const dl of [...upcomingDeadlines, ...overdueDeadlines]) {
    for (const reminder of dl.reminders) {
      try {
        // Mark as sent (email will be sent by the dispatch service on next cron run)
        await db.reminder.update({
          where: { id: reminder.id },
          data: { sent: true, sentAt: new Date() },
        });
        sentCount++;
      } catch (e) {
        failedCount++;
        errors.push(`Failed to mark reminder ${reminder.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return { sentCount, failedCount, errors };
}
