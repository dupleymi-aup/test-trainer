import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { parseSearchParams, logApiError } from "@/lib/api-error-handler";
import { checkRateLimit, rateLimits, createRateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";

const historyParamsSchema = z.object({
  taskId: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const guard = await requireStudent();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const rateResult = checkRateLimit(`studentHistory:${session.userId}`, rateLimits.studentHistory);
    if (rateResult.limited) {
      return createRateLimitResponse(rateResult.resetAt);
    }

    const params = parseSearchParams(req, historyParamsSchema);
    if (!params.success) return params.errorResponse;
    const { taskId } = params.data;

    if (taskId) {
      // Detailed history for a specific task
      const task = tasks.find((t) => t.id === Number(taskId));
      const attempts = await db.attempt.findMany({
        where: { userId: session.userId, taskId },
        orderBy: { createdAt: "asc" },
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

      return NextResponse.json({
        task: task
          ? { id: task.id, name: task.name, difficulty: task.difficulty, topics: task.topics }
          : null,
        attempts,
      });
    }

    // List of all tasks the user has attempted
    const attempts = await db.attempt.findMany({
      where: { userId: session.userId },
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

    const taskHistory = Array.from(taskMap.entries()).map(([taskId, taskAttempts]) => {
      const task = tasks.find((t) => t.id === Number(taskId));
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

    return NextResponse.json({ taskHistory });
  } catch (error) {
    logApiError("student/history", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
