import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { logger } from "@/lib/logger";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    const cacheKey = makeCacheKey("task-detail", { taskId: taskId || "" });
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const allAttempts = await db.attempt.findMany({
      select: {
        id: true,
        userId: true,
        taskId: true,
        score: true,
        ecCoverage: true,
        bvCoverage: true,
        correctness: true,
        timeSpent: true,
        coveredEcIds: true,
        coveredBvDescriptions: true,
        createdAt: true,
        user: { select: { name: true, group: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const taskMap = new Map(tasks.map((t) => [String(t.id), t]));

    // Group attempts by task
    const byTask: Record<string, typeof allAttempts> = {};
    for (const a of allAttempts) {
      if (!byTask[a.taskId]) byTask[a.taskId] = [];
      byTask[a.taskId].push(a);
    }

    const taskDetails = Object.entries(byTask).map(([tid, attempts]) => {
      const task = taskMap.get(tid);
      const scores = attempts.map((a) => a.score);
      const avgScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      const median = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];
      const failRate = Math.round((scores.filter((s) => s < 50).length / scores.length) * 100);
      const avgTime = Math.round(attempts.reduce((s, a) => s + a.timeSpent, 0) / attempts.length);
      const avgEc = Math.round(attempts.reduce((s, a) => s + a.ecCoverage, 0) / attempts.length);
      const avgBv = Math.round(attempts.reduce((s, a) => s + a.bvCoverage, 0) / attempts.length);
      const avgCorrectness = Math.round(attempts.reduce((s, a) => s + a.correctness, 0) / attempts.length);

      // Score distribution
      const distribution = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
      scores.forEach((s) => {
        if (s <= 20) distribution["0-20"]++;
        else if (s <= 40) distribution["21-40"]++;
        else if (s <= 60) distribution["41-60"]++;
        else if (s <= 80) distribution["61-80"]++;
        else distribution["81-100"]++;
      });

      // Common mistakes: ECs most often missed
      const ecMissRate: Record<string, { total: number; missed: number }> = {};
      for (const a of attempts) {
        if (task) {
          for (const ec of task.equivalenceClasses) {
            if (!ecMissRate[ec.id]) ecMissRate[ec.id] = { total: 0, missed: 0 };
            ecMissRate[ec.id].total++;
            try {
              const covered = JSON.parse(a.coveredEcIds) as string[];
              if (!covered.includes(ec.id)) ecMissRate[ec.id].missed++;
            } catch {
              ecMissRate[ec.id].missed++;
            }
          }
        }
      }
      const commonMistakes = Object.entries(ecMissRate)
        .map(([id, data]) => ({
          id,
          name: task?.equivalenceClasses.find((e) => e.id === id)?.name || id,
          missRate: Math.round((data.missed / data.total) * 100),
        }))
        .sort((a, b) => b.missRate - a.missRate)
        .slice(0, 5);

      // Trend over time
      const dateMap: Record<string, { scores: number[] }> = {};
      for (const a of attempts) {
        const date = a.createdAt.toISOString().split("T")[0];
        if (!dateMap[date]) dateMap[date] = { scores: [] };
        dateMap[date].scores.push(a.score);
      }
      const trend = Object.entries(dateMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          avgScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
          attempts: data.scores.length,
        }));

      // Students struggling with this task
      const studentScores: Record<string, { scores: number[]; name: string; group: string }> = {};
      for (const a of attempts) {
        if (!studentScores[a.userId]) studentScores[a.userId] = { scores: [], name: a.user.name || "", group: a.user.group || "" };
        studentScores[a.userId].scores.push(a.score);
      }
      const strugglingStudents = Object.entries(studentScores)
        .map(([id, data]) => ({
          studentId: id,
          name: data.name,
          group: data.group,
          avgScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
          attempts: data.scores.length,
        }))
        .filter((s) => s.avgScore < 50)
        .sort((a, b) => a.avgScore - b.avgScore)
        .slice(0, 10);

      return {
        taskId: tid,
        taskName: task?.name || `Задание ${tid}`,
        difficulty: task?.difficulty || "Unknown",
        topics: task?.topics || [],
        metrics: {
          avgScore,
          minScore,
          maxScore,
          median,
          failRate,
          avgTime,
          avgEc,
          avgBv,
          avgCorrectness,
          totalAttempts: attempts.length,
          uniqueStudents: Object.keys(studentScores).length,
        },
        distribution,
        commonMistakes,
        trend,
        strugglingStudents,
      };
    });

    let result = taskDetails;
    if (taskId) {
      result = taskDetails.filter((t) => t.taskId === taskId);
    }
    result.sort((a, b) => b.metrics.totalAttempts - a.metrics.totalAttempts);

    setCache(cacheKey, result, DEFAULT_TTL.medium);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to fetch task detail analytics", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch task detail analytics" }, { status: 500 });
  }
}
