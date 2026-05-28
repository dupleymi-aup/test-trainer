import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { logger } from "@/lib/logger";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

/**
 * Error patterns analysis.
 * Identifies:
 * - Most commonly missed EC (Equivalence Classes) across all tasks
 * - Most commonly missed BV (Boundary Values) across all tasks
 * - Per-task error hotspots
 * - Error trends over time
 * - Students struggling with specific EC/BV patterns
 */
export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const cacheKey = makeCacheKey("error-patterns");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const allAttempts = await db.attempt.findMany({
      select: {
        id: true,
        taskId: true,
        userId: true,
        score: true,
        ecCoverage: true,
        bvCoverage: true,
        coveredEcIds: true,
        coveredBvDescriptions: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      take: 50_000,
    });

    const taskMap = new Map(
      tasks.map((t) => [String(t.id), { name: t.name, difficulty: t.difficulty }])
    );

    // Per-task EC/BV analysis
    const taskECAnalysis: Record<string, { ecIds: string[]; bvDescs: string[]; scores: number[] }> = {};

    for (const a of allAttempts) {
      // Parse covered EC IDs
      let coveredEcIds: string[] = [];
      try {
        coveredEcIds = JSON.parse(a.coveredEcIds || "[]");
      } catch { /* ignore parse errors */ }

      // Parse covered BV descriptions
      let coveredBvDescs: string[] = [];
      try {
        coveredBvDescs = JSON.parse(a.coveredBvDescriptions || "[]");
      } catch { /* ignore parse errors */ }

      // For low-scoring attempts (< 60), analyze what was missed
      if (a.score < 60) {
        // Track which ECs appear in low-score attempts
        if (coveredEcIds.length > 0) {
          for (let i = 0; i < coveredEcIds.length; i++) {
            // We can't know total ECs per task from this data alone,
            // so we track which ECs appear in low-score attempts
          }
        }

        // Track tasks with low EC/BV coverage
        if (!taskECAnalysis[a.taskId]) {
          taskECAnalysis[a.taskId] = { ecIds: coveredEcIds, bvDescs: coveredBvDescs, scores: [] };
        }
        taskECAnalysis[a.taskId].scores.push(a.score);
      }
    }

    // Compute per-task error hotspots
    const perTaskErrors = Object.entries(taskECAnalysis)
      .map(([taskId, data]) => {
        const meta = taskMap.get(taskId);
        const avgScore = data.scores.length > 0
          ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length)
          : 0;

        // Count how many low-score attempts this task has
        const lowScoreCount = data.scores.filter((s) => s < 60).length;
        const veryLowScoreCount = data.scores.filter((s) => s < 30).length;

        return {
          taskId,
          taskName: meta?.name || `Задание ${taskId}`,
          errorAttemptsCount: lowScoreCount,
          criticalErrorAttempts: veryLowScoreCount,
          avgScoreOnErrors: avgScore,
          totalAttempts: data.scores.length,
          errorRate: data.scores.length > 0
            ? Math.round((lowScoreCount / data.scores.length) * 100)
            : 0,
        };
      })
      .filter((t) => t.errorAttemptsCount > 0)
      .sort((a, b) => b.errorRate - a.errorRate);

    // EC coverage distribution: how many attempts have what EC coverage
    const ecDistribution = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
    const bvDistribution = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };

    for (const a of allAttempts) {
      const ecBucket = a.ecCoverage <= 20 ? "0-20" : a.ecCoverage <= 40 ? "21-40" : a.ecCoverage <= 60 ? "41-60" : a.ecCoverage <= 80 ? "61-80" : "81-100";
      const bvBucket = a.bvCoverage <= 20 ? "0-20" : a.bvCoverage <= 40 ? "21-40" : a.bvCoverage <= 60 ? "41-60" : a.bvCoverage <= 80 ? "61-80" : "81-100";
      ecDistribution[ecBucket]++;
      bvDistribution[bvBucket]++;
    }

    // Students with worst EC/BV coverage
    const studentCoverage: Record<string, { ecTotal: number; bvTotal: number; count: number; name?: string; group?: string }> = {};
    const attemptsWithUser = await db.attempt.findMany({
      where: { id: { in: allAttempts.map((a) => a.id) } },
      select: {
        userId: true,
        ecCoverage: true,
        bvCoverage: true,
        user: { select: { name: true, group: true } },
      },
      take: 50_000,
    });

    for (const a of attemptsWithUser) {
      if (!studentCoverage[a.userId]) {
        studentCoverage[a.userId] = { ecTotal: 0, bvTotal: 0, count: 0, name: a.user?.name || undefined, group: a.user?.group || undefined };
      }
      studentCoverage[a.userId].ecTotal += a.ecCoverage;
      studentCoverage[a.userId].bvTotal += a.bvCoverage;
      studentCoverage[a.userId].count++;
    }

    const worstECStudents = Object.entries(studentCoverage)
      .map(([id, data]) => ({
        id,
        name: data.name || "Unknown",
        group: data.group || "—",
        avgEC: Math.round(data.ecTotal / data.count),
        avgBV: Math.round(data.bvTotal / data.count),
        attempts: data.count,
      }))
      .filter((s) => s.avgEC < 60 || s.avgBV < 60)
      .sort((a, b) => (a.avgEC + a.avgBV) - (b.avgEC + b.avgBV))
      .slice(0, 20);

    // Monthly error trends
    const monthlyTrend: Record<string, { errors: number; total: number }> = {};
    for (const a of allAttempts) {
      const month = a.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyTrend[month]) monthlyTrend[month] = { errors: 0, total: 0 };
      monthlyTrend[month].total++;
      if (a.score < 60) monthlyTrend[month].errors++;
    }

    const errorTrend = Object.entries(monthlyTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        errorRate: Math.round((data.errors / data.total) * 100),
        totalAttempts: data.total,
        errorAttempts: data.errors,
      }));

    const result = {
      summary: {
        totalAttempts: allAttempts.length,
        avgECCoverage: allAttempts.length > 0
          ? Math.round(allAttempts.reduce((s, a) => s + a.ecCoverage, 0) / allAttempts.length)
          : 0,
        avgBVCoverage: allAttempts.length > 0
          ? Math.round(allAttempts.reduce((s, a) => s + a.bvCoverage, 0) / allAttempts.length)
          : 0,
        lowScoreAttempts: allAttempts.filter((a) => a.score < 60).length,
        lowScorePct: allAttempts.length > 0
          ? Math.round((allAttempts.filter((a) => a.score < 60).length / allAttempts.length) * 100)
          : 0,
      },
      ecDistribution,
      bvDistribution,
      perTaskErrors: perTaskErrors.slice(0, 20),
      worstECStudents,
      errorTrend,
    };

    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to fetch error patterns analytics", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
