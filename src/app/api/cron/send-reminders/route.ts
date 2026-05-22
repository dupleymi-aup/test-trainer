import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendDeadlineReminders } from "@/lib/reminder-dispatch";
import { secureCompare } from "@/lib/crypto";

/**
 * Vercel Cron endpoint for automated reminder sending.
 *
 * Validates the CRON_SECRET from the Authorization header,
 * then triggers the reminder dispatch service.
 *
 * Configured in vercel.json to run daily at 9:00 AM UTC.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.CRON_SECRET) {
    logger.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (!secureCompare(authHeader.slice(7), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const result = await sendDeadlineReminders();

    await db.activityLog.create({
      data: {
        action: "CRON_REMINDERS_SENT",
        entity: "Reminder",
        details: JSON.stringify(result),
      },
    });

    logger.info(
      `Cron: Sent ${result.sentCount} reminders (${result.failedCount} failed)`
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Cron: Failed to send reminders", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
