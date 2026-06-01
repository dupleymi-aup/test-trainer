import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";

export async function GET(req: Request) {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

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
      if (!taskMap.has(key)) taskMap.set(key, []);
      taskMap.get(key)!.push(attempt);
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
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
