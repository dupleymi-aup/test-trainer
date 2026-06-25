import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandler } from "@/lib/api-error-handler";
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
  return withErrorHandler(req, async () => {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (!secureCompare(authHeader.slice(7), process.env.CRON_SECRET)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const result = await sendDeadlineReminders();

    await db.activityLog.create({
      data: {
        action: "CRON_REMINDERS_SENT",
        entity: "Reminder",
        details: JSON.stringify(result),
      },
    });

    return NextResponse.json(result);
  });
}
