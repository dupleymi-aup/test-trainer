import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { getCache, setCache } from "@/lib/analytics-cache";

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    const auth = unwrapGuard(await requireStudent());

    const cacheKey = `student-history:${auth.userId}`;
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // List of all tasks the user has attempted
    const attempts = await db.attempt.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        taskId: true,
        score: true,
        ecCoverage: true,
        bvCoverage: true,
        correctness: true,
        timeSpent: true,
        createdAt: true,
      },
    });

    // Group by taskId
    const taskMap = new Map<string, typeof attempts>();
    for (const attempt of attempts) {
      const key = String(attempt.taskId);
      const entry = taskMap.get(key);
      if (entry) {
        entry.push(attempt);
      } else {
        taskMap.set(key, [attempt]);
      }
    }

    const taskHistory = Array.from(taskMap.entries()).map(([taskId, taskAttempts]: [string, typeof attempts]) => {
      const task = tasks.find((t: typeof tasks[number]) => t.id === Number(taskId));
      const scores = taskAttempts.map((a) => a.score);
      return {
        taskId,
        taskName: task?.name || `Задание #${taskId}`,
        difficulty: task?.difficulty || "—",
        topics: task?.topics || [],
        bestScore: Math.max(...scores),
        avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        attemptsCount: taskAttempts.length,
        lastAttempt: taskAttempts[0].createdAt.toISOString(),
        lastScore: taskAttempts[0].score,
      };
    });

    setCache(cacheKey, { taskHistory }, 300000);
    return NextResponse.json({ taskHistory });
  });
}

// Keep response in cache for 5 minutes
