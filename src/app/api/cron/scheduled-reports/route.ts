import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { secureCompare } from "@/lib/crypto";

/**
 * GET /api/cron/scheduled-reports
 * Cron job: generates and emails weekly summary report to admins.
 * Protected by CRON_SECRET header.
 * Schedule: Monday 8:00 AM UTC (configure in vercel.json)
 */
export async function GET(req: Request) {
  // Verify cron secret using constant-time comparison to prevent timing attacks
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (
    !cronSecret ||
    !authHeader?.startsWith("Bearer ") ||
    !secureCompare(authHeader.slice(7), cronSecret)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    // Gather summary data
    const [totalStudents, totalTeachers, totalGroups, totalAttempts, activeStudents30d] =
      await Promise.all([
        db.user.count({ where: { role: "STUDENT", deletedAt: null } }),
        db.user.count({ where: { role: "TEACHER", deletedAt: null } }),
        db.group.count(),
        db.attempt.count(),
        db.user.count({
          where: { role: "STUDENT", deletedAt: null, attempts: { some: { createdAt: { gte: thirtyDaysAgo } } } },
        }),
      ]);

    const avgScoreResult = await db.attempt.aggregate({ _avg: { score: true } });
    const avgScore = Math.round(avgScoreResult._avg.score ?? 0);

    const attemptsLastWeek = await db.attempt.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    const activeRate = totalStudents > 0 ? Math.round((activeStudents30d / totalStudents) * 100) : 0;

    // At-risk count
    const students = await db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      select: {
        id: true, name: true, email: true, createdAt: true,
        attempts: {
          select: { score: true, ecCoverage: true, bvCoverage: true, createdAt: true },
          orderBy: { createdAt: "asc" },
          take: 50,
        },
      },
      take: 2000,
    });

    let highRiskCount = 0;
    for (const s of students) {
      const attempts = s.attempts;
      if (attempts.length === 0) continue;
      const scores = attempts.map((a) => a.score);
      const bestScore = Math.max(...scores);
      const lastAttempt = attempts[attempts.length - 1];
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);

      let riskScore = 0;
      if (bestScore < 50) riskScore++;
      if (lastAttempt && lastAttempt.createdAt < fourteenDaysAgo) riskScore++;
      if (attempts.length < 3 && s.createdAt < sevenDaysAgo) riskScore++;
      if (riskScore >= 4) highRiskCount++;
    }

    // Get admin emails
    const admins = await db.user.findMany({
      where: { role: "ADMIN", deletedAt: null },
      select: { email: true, name: true },
    });

    if (admins.length === 0) {
      return NextResponse.json({ skipped: true, reason: "No admin users found" });
    }

    // Generate HTML email body
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; border-bottom: 2px solid #10b981; padding-bottom: 8px;">Еженедельный отчёт платформы</h1>
        <p style="color: #666;">Период: ${sevenDaysAgo.toLocaleDateString("ru-RU")} — ${now.toLocaleDateString("ru-RU")}</p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Студенты</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${totalStudents}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Преподаватели</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${totalTeachers}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Группы</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${totalGroups}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Всего попыток</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${totalAttempts}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Попыток за неделю</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${attemptsLastWeek}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Средний балл</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${avgScore}%</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Активные студенты (30д)</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${activeStudents30d} (${activeRate}%)</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Студенты в зоне риска</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: ${highRiskCount > 0 ? "#ef4444" : "#10b981"};">${highRiskCount}</td></tr>
        </table>

        <p style="color: #666; font-size: 14px;">
          <a href="${process.env.NEXTAUTH_URL}/admin/executive" style="color: #10b981;">Подробнее в панели администратора →</a>
        </p>
      </div>
    `;

    // Send emails
    let sentCount = 0;
    for (const admin of admins) {
      if (!admin.email) continue;
      try {
        await sendEmail({
          to: admin.email,
          subject: `Еженедельный отчёт — ${now.toLocaleDateString("ru-RU")}`,
          html,
        });
        sentCount++;
      } catch (err) {
        logger.error(`Failed to send report email to ${admin.email}`, err instanceof Error ? err : undefined);
      }
    }

    // Create notification
    await db.notification.create({
      data: {
        type: "SCHEDULED_REPORT",
        severity: "info",
        title: "Еженедельный отчёт отправлен",
        message: `Отчёт отправлен ${sentCount} администраторам. Студентов: ${totalStudents}, ср. балл: ${avgScore}%, risk: ${highRiskCount}`,
        entity: "system",
        actionUrl: "/admin/executive",
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "CRON_SCHEDULED_REPORT",
        entity: "Report",
        details: JSON.stringify({ sentCount, totalStudents, avgScore, highRiskCount }),
      },
    });

    return NextResponse.json({
      success: true,
      sentCount,
      totalStudents,
      avgScore,
      highRiskCount,
    });
  } catch (error) {
    logger.error("Scheduled report cron failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Scheduled report failed" }, { status: 500 });
  }
}
