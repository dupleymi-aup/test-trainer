import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  try {
    // Run queries to check DB health — all tables
    const [userCount, attemptCount, groupCount, groupTaskCount, activityLogCount, settingsCount, verificationCodeCount] = await Promise.all([
      db.user.count(),
      db.attempt.count(),
      db.group.count(),
      db.groupTask.count(),
      db.activityLog.count(),
      db.systemSetting.count(),
      db.verificationCode.count(),
    ]);

    return NextResponse.json({
      status: "healthy",
      tables: {
        users: userCount,
        attempts: attemptCount,
        groups: groupCount,
        group_tasks: groupTaskCount,
        activity_logs: activityLogCount,
        system_settings: settingsCount,
        verification_codes: verificationCodeCount,
      },
      totalRecords: userCount + attemptCount + groupCount + groupTaskCount + activityLogCount + settingsCount + verificationCodeCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Database health check failed", error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
