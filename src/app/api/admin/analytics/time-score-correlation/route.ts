import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { logger } from "@/lib/logger";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

/**
 * Analyze the correlation between time spent and score quality.
 * - Global correlation coefficient
 * - Per-task time vs score scatter
 * - Time quartiles analysis
 * - "Rushers" (fast + low score) vs "Perfectionists" (slow + high score)
 * - Optimal time ranges per task
 */
export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const cacheKey = makeCacheKey("time-score-correlation");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const allAttempts = await db.attempt.findMany({
      select: {
        taskId: true,
        userId: true,
        score: true,
        timeSpent: true,
        createdAt: true,
      },
      where: {
        timeSpent: { gt: 0 },
      },
      orderBy: { createdAt: "asc" },
      take: 50_000,
    });

    const taskMap = new Map(
      tasks.map((t) => [String(t.id), { name: t.name, difficulty: t.difficulty }])
    );

    // Global correlation (Pearson)
    const times = allAttempts.map((a) => a.timeSpent);
    const scores = allAttempts.map((a) => a.score);

    const meanTime = times.reduce((s, v) => s + v, 0) / times.length;
    const meanScore = scores.reduce((s, v) => s + v, 0) / scores.length;

    let covTS = 0, varT = 0, varS = 0;
    for (let i = 0; i < times.length; i++) {
      const dt = times[i] - meanTime;
      const ds = scores[i] - meanScore;
      covTS += dt * ds;
      varT += dt * dt;
      varS += ds * ds;
    }
    const globalCorrelation = varT > 0 && varS > 0
      ? covTS / Math.sqrt(varT * varS)
      : 0;

    // Time quartiles analysis
    const sorted = [...allAttempts].sort((a, b) => a.timeSpent - b.timeSpent);
    const q25 = sorted[Math.floor(sorted.length * 0.25)];
    const q50 = sorted[Math.floor(sorted.length * 0.50)];
    const q75 = sorted[Math.floor(sorted.length * 0.75)];

    const timeSegments = [
      { label: "Быстрые (<Q25)", minTime: 0, maxTime: q25.timeSpent, attempts: [] as typeof allAttempts },
      { label: "Средние (Q25-Q50)", minTime: q25.timeSpent, maxTime: q50.timeSpent, attempts: [] as typeof allAttempts },
      { label: "Выше среднего (Q50-Q75)", minTime: q50.timeSpent, maxTime: q75.timeSpent, attempts: [] as typeof allAttempts },
      { label: "Медленные (>Q75)", minTime: q75.timeSpent, maxTime: Infinity, attempts: [] as typeof allAttempts },
    ];

    for (const a of allAttempts) {
      for (const seg of timeSegments) {
        if (a.timeSpent >= seg.minTime && a.timeSpent < seg.maxTime) {
          seg.attempts.push(a);
          break;
        }
      }
    }

    const segmentAnalysis = timeSegments.map((seg) => ({
      label: seg.label,
      count: seg.attempts.length,
      avgScore: seg.attempts.length > 0
        ? Math.round(seg.attempts.reduce((s, a) => s + a.score, 0) / seg.attempts.length)
        : 0,
      avgTimeSeconds: seg.attempts.length > 0
        ? Math.round(seg.attempts.reduce((s, a) => s + a.timeSpent, 0) / seg.attempts.length)
        : 0,
    }));

    // Per-task analysis
    const taskAttempts: Record<string, typeof allAttempts> = {};
    for (const a of allAttempts) {
      if (!taskAttempts[a.taskId]) taskAttempts[a.taskId] = [];
      taskAttempts[a.taskId].push(a);
    }

    const perTaskAnalysis = Object.entries(taskAttempts)
      .filter(([_, attempts]) => attempts.length >= 5) // min 5 attempts
      .map(([taskId, attempts]) => {
        const meta = taskMap.get(taskId);
        const t = attempts.map((a) => a.timeSpent);
        const s = attempts.map((a) => a.score);

        const mt = t.reduce((sum, v) => sum + v, 0) / t.length;
        const ms = s.reduce((sum, v) => sum + v, 0) / s.length;

        let c = 0, vt = 0, vs = 0;
        for (let i = 0; i < t.length; i++) {
          const dt = t[i] - mt;
          const ds = s[i] - ms;
          c += dt * ds;
          vt += dt * dt;
          vs += ds * ds;
        }
        const corr = vt > 0 && vs > 0 ? c / Math.sqrt(vt * vs) : 0;

        // Optimal time range: where top 25% scorers cluster
        const top25Threshold = [...s].sort((a, b) => b - a)[Math.floor(s.length * 0.25)];
        const topAttempts = attempts.filter((a) => a.score >= top25Threshold);
        const topTimes = topAttempts.map((a) => a.timeSpent).sort((a, b) => a - b);
        const optimalMin = topTimes.length > 0 ? topTimes[0] : 0;
        const optimalMax = topTimes.length > 0 ? topTimes[topTimes.length - 1] : 0;

        return {
          taskId,
          taskName: meta?.name || `Задание ${taskId}`,
          attemptsCount: attempts.length,
          avgScore: Math.round(ms),
          avgTimeSeconds: Math.round(mt),
          avgTimeMinutes: Math.round(mt / 60),
          correlation: Math.round(corr * 1000) / 1000,
          optimalTimeRange: { min: Math.round(optimalMin / 60), max: Math.round(optimalMax / 60) },
        };
      });

    // Rushers vs Perfectionists vs Normal
    const timeThreshold = q50.timeSpent; // median time
    const _scoreThreshold = q50.score; // median score - reuse sorted

    // Actually compute median score properly
    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore = sortedScores[Math.floor(sortedScores.length / 2)];

    const rushers = allAttempts.filter((a) => a.timeSpent < timeThreshold && a.score < medianScore);
    const perfectionists = allAttempts.filter((a) => a.timeSpent > timeThreshold && a.score >= medianScore);
    const efficient = allAttempts.filter((a) => a.timeSpent < timeThreshold && a.score >= medianScore);
    const struggling = allAttempts.filter((a) => a.timeSpent > timeThreshold && a.score < medianScore);

    const scatterData = allAttempts
      .slice(0, 5000) // limit for chart
      .map((a) => ({
        timeSpent: Math.round(a.timeSpent / 60),
        score: a.score,
        taskId: a.taskId,
        taskName: taskMap.get(a.taskId)?.name || `Задание ${a.taskId}`,
      }));

    const result = {
      globalCorrelation: Math.round(globalCorrelation * 1000) / 1000,
      totalAttempts: allAttempts.length,
      medianTimeSeconds: Math.round(q50.timeSpent),
      medianScore,
      segmentAnalysis,
      perTaskAnalysis: perTaskAnalysis.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)),
      behavioralSegments: {
        rushers: {
          count: rushers.length,
          pct: Math.round((rushers.length / allAttempts.length) * 100),
          avgScore: rushers.length > 0 ? Math.round(rushers.reduce((s, a) => s + a.score, 0) / rushers.length) : 0,
          avgTimeSeconds: rushers.length > 0 ? Math.round(rushers.reduce((s, a) => s + a.timeSpent, 0) / rushers.length) : 0,
        },
        perfectionists: {
          count: perfectionists.length,
          pct: Math.round((perfectionists.length / allAttempts.length) * 100),
          avgScore: perfectionists.length > 0 ? Math.round(perfectionists.reduce((s, a) => s + a.score, 0) / perfectionists.length) : 0,
          avgTimeSeconds: perfectionists.length > 0 ? Math.round(perfectionists.reduce((s, a) => s + a.timeSpent, 0) / perfectionists.length) : 0,
        },
        efficient: {
          count: efficient.length,
          pct: Math.round((efficient.length / allAttempts.length) * 100),
          avgScore: efficient.length > 0 ? Math.round(efficient.reduce((s, a) => s + a.score, 0) / efficient.length) : 0,
          avgTimeSeconds: efficient.length > 0 ? Math.round(efficient.reduce((s, a) => s + a.timeSpent, 0) / efficient.length) : 0,
        },
        struggling: {
          count: struggling.length,
          pct: Math.round((struggling.length / allAttempts.length) * 100),
          avgScore: struggling.length > 0 ? Math.round(struggling.reduce((s, a) => s + a.score, 0) / struggling.length) : 0,
          avgTimeSeconds: struggling.length > 0 ? Math.round(struggling.reduce((s, a) => s + a.timeSpent, 0) / struggling.length) : 0,
        },
      },
      scatterData,
    };

    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to fetch time-score correlation analytics", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
