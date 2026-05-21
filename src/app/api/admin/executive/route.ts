import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { computeStudentRisk, AttemptData, batchComputeStudentRisk } from "@/lib/risk-analysis";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const cacheKey = makeCacheKey("executive");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    // KPIs via count() — no full table scans
    const [totalStudents, totalTeachers, totalGroups, totalAttempts, activeStudents30d] =
      await Promise.all([
        db.user.count({ where: { role: "STUDENT", deletedAt: null } }),
        db.user.count({ where: { role: "TEACHER", deletedAt: null } }),
        db.group.count(),
        db.attempt.count(),
        db.user.count({
          where: {
            role: "STUDENT",
            deletedAt: null,
            attempts: { some: { createdAt: { gte: thirtyDaysAgo } } },
          },
        }),
      ]);

    // Average score via aggregation
    const avgScoreResult = await db.attempt.aggregate({
      _avg: { score: true },
    });
    const avgScore = Math.round(avgScoreResult._avg.score ?? 0);

    // Active rate
    const activeRate = totalStudents > 0
      ? Math.round((activeStudents30d / totalStudents) * 100)
      : 0;

    // Role distribution
    const roleDistribution = await db.user.groupBy({
      by: ["role"],
      _count: true,
      where: { deletedAt: null },
    });

    // Risk breakdown — use aggregated queries instead of loading all students
    const studentsForRisk = await db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      select: {
        id: true, name: true, email: true, group: true, university: true, createdAt: true,
        attempts: {
          select: { score: true, ecCoverage: true, bvCoverage: true, createdAt: true },
          orderBy: { createdAt: "asc" },
          take: 50,
        },
      },
      take: 2000,
    });

    const riskMap = batchComputeStudentRisk(
      studentsForRisk.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        attempts: s.attempts.map((a) => ({
          score: a.score,
          ecCoverage: a.ecCoverage,
          bvCoverage: a.bvCoverage,
          createdAt: a.createdAt,
        })) as AttemptData[],
      }))
    );

    let lowRisk = 0, mediumRisk = 0, highRisk = 0, noRisk = 0;
    const topRiskStudents: Array<{
      id: string; name: string; group: string; university: string;
      riskScore: number; dropoutRisk: string; avgScore: number; trend: string;
    }> = [];

    for (const s of studentsForRisk) {
      const result = riskMap.get(s.id);
      if (!result) { noRisk++; continue; }
      const { risk, stats } = result;
      const score = risk.riskFactors.length + (risk.trend === "declining" ? 1 : 0) + (stats.bestScore < 30 ? 1 : 0);

      if (risk.dropoutRisk === "high") highRisk++;
      else if (risk.dropoutRisk === "medium") mediumRisk++;
      else if (risk.riskFactors.length === 0) noRisk++;
      else lowRisk++;

      if (risk.dropoutRisk === "high" || risk.dropoutRisk === "medium") {
        topRiskStudents.push({
          id: s.id,
          name: s.name || s.email || "Unknown",
          group: s.group || "",
          university: s.university || "",
          riskScore: score,
          dropoutRisk: risk.dropoutRisk,
          avgScore: stats.avgScore,
          trend: risk.trend,
        });
      }
    }

    topRiskStudents.sort((a, b) => b.riskScore - a.riskScore);

    // Attempts trend (last 30 days) — for composed chart
    const recentAttempts = await db.attempt.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { score: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 10_000,
    });

    const volumeMap: Record<string, { count: number; totalScore: number }> = {};
    for (const a of recentAttempts) {
      const date = a.createdAt.toISOString().split("T")[0];
      if (!volumeMap[date]) volumeMap[date] = { count: 0, totalScore: 0 };
      volumeMap[date].count++;
      volumeMap[date].totalScore += a.score;
    }

    const activityTrend = Object.entries(volumeMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        label: new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
        attempts: data.count,
        avgScore: Math.round(data.totalScore / data.count),
      }));

    // Top groups by avg score
    const groups = await db.group.findMany({ select: { id: true, name: true } });
    const groupMembers = await db.userGroup.findMany({
      where: { groupId: { in: groups.map((g) => g.id) } },
      select: { userId: true, groupId: true },
    });
    const membersByGroup: Record<string, string[]> = {};
    for (const m of groupMembers) {
      if (!membersByGroup[m.groupId]) membersByGroup[m.groupId] = [];
      membersByGroup[m.groupId].push(m.userId);
    }

    const memberIds = [...new Set(groupMembers.map((m) => m.userId))];
    const attemptsByUser: Record<string, number[]> = {};
    if (memberIds.length > 0) {
      const attempts = await db.attempt.findMany({
        where: { userId: { in: memberIds } },
        select: { userId: true, score: true },
        take: 50_000,
      });
      for (const a of attempts) {
        if (!attemptsByUser[a.userId]) attemptsByUser[a.userId] = [];
        attemptsByUser[a.userId].push(a.score);
      }
    }

    interface GroupPerf { groupId: string; name: string; avgScore: number; studentCount: number }

    const topGroups = groups
      .map((g): GroupPerf | null => {
        const userIds = membersByGroup[g.id] || [];
        if (userIds.length === 0) return null;
        const allScores = userIds.flatMap((uid) => attemptsByUser[uid] || []);
        if (allScores.length === 0) return null;
        return {
          groupId: g.id,
          name: g.name,
          avgScore: Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length),
          studentCount: userIds.length,
        };
      })
      .filter((g): g is GroupPerf => g !== null)
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);

    const result = {
      kpi: {
        totalStudents,
        totalTeachers,
        totalGroups,
        totalAttempts,
        avgScore,
        activeStudents30d,
        activeRate,
      },
      roleDistribution: roleDistribution.map((r) => ({
        role: r.role,
        count: r._count,
      })),
      riskBreakdown: { noRisk, lowRisk, mediumRisk, highRisk, total: noRisk + lowRisk + mediumRisk + highRisk },
      topRiskStudents: topRiskStudents.slice(0, 10),
      activityTrend,
      topGroups,
    };

    setCache(cacheKey, result, DEFAULT_TTL.medium);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to fetch executive summary", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch executive summary" }, { status: 500 });
  }
}
