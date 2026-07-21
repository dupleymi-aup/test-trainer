import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    unwrapGuard(await requireAdmin());

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
  });
}
