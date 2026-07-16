import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

/**
 * Item Response Theory-lite analysis.
 * For each task, compute:
 * - difficulty (p-value: avg score / 100)
 * - discrimination (point-biserial correlation)
 * - guessability (% of students who got >80% on first attempt)
 * - time efficiency (avg time vs score ratio)
 */
export async function GET() {
  return withErrorHandler(undefined, async () => {
    unwrapGuard(await requireAdmin());

    const cacheKey = makeCacheKey("item-difficulty");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const allAttempts = await db.attempt.findMany({
      select: {
        taskId: true,
        score: true,
        timeSpent: true,
        userId: true,
        createdAt: true,
      },
      take: 50_000,
      orderBy: { createdAt: "asc" },
    });

    // Group attempts by task
    const taskAttempts: Record<string, typeof allAttempts> = {};
    for (const a of allAttempts) {
      if (!taskAttempts[a.taskId]) taskAttempts[a.taskId] = [];
      taskAttempts[a.taskId].push(a);
    }

    // Compute global avg score for discrimination
    const globalAvgScore = allAttempts.length > 0
      ? allAttempts.reduce((s, a) => s + a.score, 0) / allAttempts.length
      : 50;

    const taskMap = new Map(
      tasks.map((t) => [String(t.id), { name: t.name, difficulty: t.difficulty }])
    );

    const taskAnalysis = Object.entries(taskAttempts).map(([taskId, attempts]) => {
      const meta = taskMap.get(taskId);
      const scores = attempts.map((a) => a.score);
      const times = attempts.map((a) => a.timeSpent);

      const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
      const pValue = avgScore / 100; // difficulty index (0=easy, 1=hard)

      // Discrimination: point-biserial correlation
      // Split students into upper (above global avg) and lower groups
      const upperGroup = scores.filter((s) => s >= globalAvgScore);
      const lowerGroup = scores.filter((s) => s < globalAvgScore);
      const upperAvg = upperGroup.length > 0 ? upperGroup.reduce((s, v) => s + v, 0) / upperGroup.length : 0;
      const lowerAvg = lowerGroup.length > 0 ? lowerGroup.reduce((s, v) => s + v, 0) / lowerGroup.length : 0;
      const discrimination = (upperAvg - lowerAvg) / 100; // normalized -1..1

      // Guessability: % of first attempts with score > 80
      const firstAttemptsByUser: Record<string, number> = {};
      for (const a of attempts) {
        if (!firstAttemptsByUser[a.userId]) {
          firstAttemptsByUser[a.userId] = a.score;
        }
      }
      const firstAttemptScores = Object.values(firstAttemptsByUser);
      const guessability = firstAttemptScores.length > 0
        ? (firstAttemptScores.filter((s) => s > 80).length / firstAttemptScores.length) * 100
        : 0;

      // Time efficiency: avg score per minute
      const validTimes = times.filter((t) => t > 0);
      const avgTimeSeconds = validTimes.length > 0 ? validTimes.reduce((s, v) => s + v, 0) / validTimes.length : 0;
      const timeEfficiency = avgTimeSeconds > 0 ? Math.round((avgScore / (avgTimeSeconds / 60)) * 100) / 100 : 0;

      // Std deviation
      const variance = scores.reduce((s, v) => s + (v - avgScore) ** 2, 0) / scores.length;
      const stdDev = Math.sqrt(variance);

      // Score distribution
      const distribution = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
      scores.forEach((s) => {
        if (s <= 20) distribution["0-20"]++;
        else if (s <= 40) distribution["21-40"]++;
        else if (s <= 60) distribution["41-60"]++;
        else if (s <= 80) distribution["61-80"]++;
        else distribution["81-100"]++;
      });

      return {
        taskId,
        taskName: meta?.name || `Задание ${taskId}`,
        declaredDifficulty: meta?.difficulty || "Unknown",
        attemptsCount: attempts.length,
        uniqueStudents: Object.keys(firstAttemptsByUser).length,
        avgScore: Math.round(avgScore),
        pValue: Math.round(pValue * 1000) / 1000,
        discrimination: Math.round(discrimination * 1000) / 1000,
        guessability: Math.round(guessability),
        timeEfficiency,
        avgTimeSeconds: Math.round(avgTimeSeconds),
        stdDev: Math.round(stdDev),
        distribution,
        qualityRating: discrimination > 0.3 && pValue > 0.3 && pValue < 0.8 ? "good"
          : discrimination > 0.2 ? "acceptable"
          : "poor",
      };
    });

    // Sort by discrimination (best discriminators first)
    taskAnalysis.sort((a, b) => b.discrimination - a.discrimination);

    const result = {
      taskAnalysis,
      summary: {
        totalTasks: taskAnalysis.length,
        avgDifficulty: taskAnalysis.length > 0
          ? Math.round(taskAnalysis.reduce((s, t) => s + t.pValue, 0) / taskAnalysis.length * 100) / 100
          : 0,
        avgDiscrimination: taskAnalysis.length > 0
          ? Math.round(taskAnalysis.reduce((s, t) => s + t.discrimination, 0) / taskAnalysis.length * 1000) / 1000
          : 0,
        goodQuality: taskAnalysis.filter((t) => t.qualityRating === "good").length,
        acceptableQuality: taskAnalysis.filter((t) => t.qualityRating === "acceptable").length,
        poorQuality: taskAnalysis.filter((t) => t.qualityRating === "poor").length,
      },
    };

    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
