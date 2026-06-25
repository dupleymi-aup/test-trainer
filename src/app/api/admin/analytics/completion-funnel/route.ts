import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { withErrorHandler } from "@/lib/api-error-handler";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

/**
 * Task completion funnel analysis.
 * Shows where students drop off, completion rates per task,
 * and identifies bottleneck tasks that cause the most attrition.
 */
export async function GET() {
  return withErrorHandler(new Request("http://localhost"), async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const cacheKey = makeCacheKey("completion-funnel");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const totalStudents = await db.user.count({
      where: { role: "STUDENT", deletedAt: null },
    });

    const allAttempts = await db.attempt.findMany({
      select: {
        taskId: true,
        userId: true,
        score: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const taskMap = new Map(
      tasks.map((t) => [String(t.id), { name: t.name, difficulty: t.difficulty }])
    );

    // Get unique students per task
    const studentsByTask: Record<string, Set<string>> = {};
    const attemptsByTask: Record<string, number> = {};
    const scoresByTask: Record<string, number[]> = {};
    const passByTask: Record<string, number> = {};
    const failByTask: Record<string, number> = {};

    const PASS_THRESHOLD = 60;

    for (const a of allAttempts) {
      if (!studentsByTask[a.taskId]) {
        studentsByTask[a.taskId] = new Set();
        attemptsByTask[a.taskId] = 0;
        scoresByTask[a.taskId] = [];
        passByTask[a.taskId] = 0;
        failByTask[a.taskId] = 0;
      }
      studentsByTask[a.taskId].add(a.userId);
      attemptsByTask[a.taskId]++;
      scoresByTask[a.taskId].push(a.score);
      if (a.score >= PASS_THRESHOLD) passByTask[a.taskId]++;
      else failByTask[a.taskId]++;
    }

    // Best score per student per task
    const bestScoreByStudentTask: Record<string, Record<string, number>> = {};
    for (const a of allAttempts) {
      if (!bestScoreByStudentTask[a.userId]) bestScoreByStudentTask[a.userId] = {};
      if (!bestScoreByStudentTask[a.userId][a.taskId] || a.score > bestScoreByStudentTask[a.userId][a.taskId]) {
        bestScoreByStudentTask[a.userId][a.taskId] = a.score;
      }
    }

    // How many tasks each student has attempted
    const tasksPerStudent: Record<string, number> = {};
    for (const [userId, taskScores] of Object.entries(bestScoreByStudentTask)) {
      tasksPerStudent[userId] = Object.keys(taskScores).length;
    }

    // Build ordered task list (by task ID, assuming sequential difficulty)
    const orderedTaskIds = [...new Set(allAttempts.map((a) => a.taskId))].sort((a, b) => Number(a) - Number(b));

    // Funnel: how many students reached each task
    const funnel = orderedTaskIds.map((taskId, idx) => {
      const meta = taskMap.get(taskId);
      const uniqueStudents = studentsByTask[taskId]?.size || 0;
      const totalAttempts = attemptsByTask[taskId] || 0;
      const scores = scoresByTask[taskId] || [];
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
      const passCount = passByTask[taskId] || 0;
      const failCount = failByTask[taskId] || 0;
      const passRate = (passCount + failCount) > 0 ? Math.round((passCount / (passCount + failCount)) * 100) : 0;
      const completionRate = totalStudents > 0 ? Math.round((uniqueStudents / totalStudents) * 100) : 0;

      // Drop-off from previous task
      const prevStudents = idx > 0 ? (studentsByTask[orderedTaskIds[idx - 1]]?.size || 0) : totalStudents;
      const dropOff = prevStudents > 0 ? Math.round(((prevStudents - uniqueStudents) / prevStudents) * 100) : 0;

      // Avg attempts to pass
      const passedStudents = new Set<string>();
      for (const [userId, taskScores] of Object.entries(bestScoreByStudentTask)) {
        if (taskScores[taskId] !== undefined) {
          if (taskScores[taskId] >= PASS_THRESHOLD) passedStudents.add(userId);
        }
      }

      // Avg attempts for students who attempted this task
      const attemptsPerStudent: Record<string, number> = {};
      for (const a of allAttempts) {
        if (a.taskId === taskId) {
          if (!attemptsPerStudent[a.userId]) attemptsPerStudent[a.userId] = 0;
          attemptsPerStudent[a.userId]++;
        }
      }
      const avgAttempts = Object.keys(attemptsPerStudent).length > 0
        ? Math.round(Object.values(attemptsPerStudent).reduce((s, v) => s + v, 0) / Object.keys(attemptsPerStudent).length * 10) / 10
        : 0;

      return {
        taskId,
        taskName: meta?.name || `Задание ${taskId}`,
        order: idx + 1,
        uniqueStudents,
        completionRate,
        totalAttempts,
        avgScore,
        passRate,
        passCount,
        failCount,
        dropOff,
        avgAttempts,
      };
    });

    // Find bottleneck tasks (highest drop-off)
    const bottlenecks = [...funnel]
      .filter((f) => f.dropOff > 0)
      .sort((a, b) => b.dropOff - a.dropOff)
      .slice(0, 5);

    // Students who completed N tasks
    const taskCompletionDistribution: Record<string, number> = {};
    for (const count of Object.values(tasksPerStudent)) {
      const bucket = count <= 1 ? "1" : count <= 3 ? "2-3" : count <= 5 ? "4-5" : count <= 10 ? "6-10" : "10+";
      if (!taskCompletionDistribution[bucket]) taskCompletionDistribution[bucket] = 0;
      taskCompletionDistribution[bucket]++;
    }

    const result = {
      totalStudents,
      totalTasks: orderedTaskIds.length,
      funnel,
      bottlenecks,
      taskCompletionDistribution,
      overallCompletionRate: totalStudents > 0
        ? Math.round((Object.values(tasksPerStudent).filter((c) => c === orderedTaskIds.length).length / totalStudents) * 100)
        : 0,
    };

    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
