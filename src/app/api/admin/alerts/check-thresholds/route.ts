import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { computeStudentRisk, AttemptData } from "@/lib/risk-analysis";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/alerts/check-thresholds
 * Checks risk thresholds and creates persistent notifications when exceeded.
 * Callable by admin UI or cron job.
 */
export async function POST(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const now = new Date();
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get thresholds from SystemSetting or use defaults — handle corrupted JSON gracefully
    const settings = await db.systemSetting.findMany({
      where: { key: { in: ["risk_student_threshold", "inactive_group_threshold", "avg_score_drop_threshold"] } },
    });
    const safeParse = (json: string) => {
      try { return JSON.parse(json); }
      catch { return json; }
    };
    const settingsMap: Record<string, unknown> = {};
    for (const s of settings) settingsMap[s.key] = safeParse(s.value);

    const riskThreshold = Number(settingsMap["risk_student_threshold"] ?? 5);
    const inactiveGroupThreshold = Number(settingsMap["inactive_group_threshold"] ?? 2);

    const created: string[] = [];

    // 1. Check high-risk student count
    const students = await db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      select: {
        id: true, name: true, email: true, createdAt: true,
        attempts: {
          select: { score: true, ecCoverage: true, bvCoverage: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
      take: 5000,
    });

    let highRiskCount = 0;
    for (const s of students) {
      const attempts: AttemptData[] = s.attempts.map((a) => ({
        score: a.score, ecCoverage: a.ecCoverage, bvCoverage: a.bvCoverage, createdAt: a.createdAt,
      }));
      if (attempts.length === 0) continue;
      const risk = computeStudentRisk(attempts, s.createdAt);
      if (risk.dropoutRisk === "high") highRiskCount++;
    }

    if (highRiskCount >= riskThreshold) {
      await db.notification.create({
        data: {
          type: "RISK_THRESHOLD",
          severity: "critical",
          title: `Превышен порог risk-студентов: ${highRiskCount}`,
          message: `Количество студентов с высоким риском (${highRiskCount}) превысило порог (${riskThreshold}). Требуется вмешательство.`,
          entity: "system",
          actionUrl: "/admin/analytics/predictions",
        },
      });
      created.push("RISK_THRESHOLD");
    }

    // 2. Check inactive groups
    const groups = await db.group.findMany({
      select: {
        id: true, name: true,
        members: { select: { userId: true } },
      },
    });

    let inactiveGroupCount = 0;
    for (const g of groups) {
      const memberIds = g.members.map((m) => m.userId);
      if (memberIds.length === 0) continue;

      const activeUsers = await db.user.count({
        where: {
          id: { in: memberIds },
          attempts: { some: { createdAt: { gte: thirtyDaysAgo } } },
        },
      });

      const inactiveRate = memberIds.length > 0
        ? (memberIds.length - activeUsers) / memberIds.length
        : 0;

      if (inactiveRate >= 0.5 && memberIds.length >= 3) {
        inactiveGroupCount++;
      }
    }

    if (inactiveGroupCount >= inactiveGroupThreshold) {
      await db.notification.create({
        data: {
          type: "INACTIVE_GROUPS",
          severity: "warning",
          title: `Много неактивных групп: ${inactiveGroupCount}`,
          message: `${inactiveGroupCount} групп имеют более 50% неактивных студентов.`,
          entity: "system",
          actionUrl: "/admin/groups",
        },
      });
      created.push("INACTIVE_GROUPS");
    }

    // 3. Check avg score drop (compare last 7 days vs previous 7 days)
    const [recentAvg, previousAvg] = await Promise.all([
      db.attempt.aggregate({
        where: { createdAt: { gte: sevenDaysAgo, lt: now } },
        _avg: { score: true },
      }),
      db.attempt.aggregate({
        where: { createdAt: { gte: new Date(sevenDaysAgo.getTime() - 7 * 86400000), lt: sevenDaysAgo } },
        _avg: { score: true },
      }),
    ]);

    const recent = recentAvg._avg.score ?? 0;
    const previous = previousAvg._avg.score ?? 0;
    const drop = previous > 0 ? ((previous - recent) / previous) * 100 : 0;
    const dropThreshold = Number(settingsMap["avg_score_drop_threshold"] ?? 15);

    if (drop >= dropThreshold && previous > 0) {
      await db.notification.create({
        data: {
          type: "SCORE_DROP",
          severity: "warning",
          title: `Снижение среднего балла на ${Math.round(drop)}%`,
          message: `Средний балл упал с ${Math.round(previous)}% до ${Math.round(recent)}% за последнюю неделю.`,
          entity: "system",
          actionUrl: "/admin/analytics/time-trends",
        },
      });
      created.push("SCORE_DROP");
    }

    return NextResponse.json({
      checked: true,
      notificationsCreated: created,
      stats: { highRiskCount, inactiveGroupCount, scoreDrop: Math.round(drop) },
    });
  } catch (error) {
    logger.error("Threshold check failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Threshold check failed" }, { status: 500 });
  }
}
