import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";

export async function GET() {
  try {
    const guard = await requireStudent();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    // Fetch all attempts for this user
    const attempts = await db.attempt.findMany({
      where: { userId: session.userId },
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

    // Calculate scores over time
    const scoresOverTime = attempts.map((a) => ({
      date: a.createdAt.toISOString().split("T")[0],
      score: a.score,
      ecCoverage: a.ecCoverage,
      bvCoverage: a.bvCoverage,
    }));

    // Calculate topic mastery
    const topicScores: Record<string, { total: number; count: number }> = {};
    for (const attempt of attempts) {
      const task = tasks.find((t) => t.id === Number(attempt.taskId));
      if (!task) continue;
      for (const topic of task.topics) {
        if (!topicScores[topic]) topicScores[topic] = { total: 0, count: 0 };
        topicScores[topic].total += attempt.score;
        topicScores[topic].count += 1;
      }
    }

    const topicMastery = Object.entries(topicScores)
      .map(([topic, data]) => ({
        topic,
        avgScore: Math.round(data.total / data.count),
        attempts: data.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    // Task breakdown
    const taskMap: Record<string, { scores: number[]; ec: number[]; bv: number[] }> = {};
    for (const attempt of attempts) {
      const taskId = String(attempt.taskId);
      if (!taskMap[taskId]) taskMap[taskId] = { scores: [], ec: [], bv: [] };
      taskMap[taskId].scores.push(attempt.score);
      taskMap[taskId].ec.push(attempt.ecCoverage);
      taskMap[taskId].bv.push(attempt.bvCoverage);
    }

    const taskBreakdown = Object.entries(taskMap)
      .map(([taskId, data]) => {
        const task = tasks.find((t) => t.id === Number(taskId));
        return {
          taskId,
          taskName: task?.name || `Задание #${taskId}`,
          difficulty: task?.difficulty || "—",
          bestScore: Math.max(...data.scores),
          avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
          avgEc: Math.round(data.ec.reduce((a, b) => a + b, 0) / data.ec.length),
          avgBv: Math.round(data.bv.reduce((a, b) => a + b, 0) / data.bv.length),
          attemptsCount: data.scores.length,
        };
      })
      .sort((a, b) => b.bestScore - a.bestScore);

    // Weak and strong areas (by topic)
    const weakAreas = topicMastery.filter((t) => t.avgScore < 50).slice(0, 5);
    const strongAreas = topicMastery.filter((t) => t.avgScore >= 70).slice(0, 5);

    // Skill gaps: topics with low coverage
    const skillGaps = topicMastery
      .filter((t) => t.avgScore < 60)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 10);

    // Difficulty breakdown
    const difficultyStats: Record<string, { completed: number; total: number }> = {};
    for (const task of tasks) {
      if (!difficultyStats[task.difficulty]) {
        difficultyStats[task.difficulty] = { completed: 0, total: 0 };
      }
      difficultyStats[task.difficulty].total += 1;
      if (taskBreakdown.some((tb) => tb.taskId === String(task.id))) {
        difficultyStats[task.difficulty].completed += 1;
      }
    }

    return NextResponse.json({
      attempts: attempts.length,
      scoresOverTime,
      topicMastery,
      taskBreakdown,
      weakAreas,
      strongAreas,
      skillGaps,
      difficultyBreakdown: Object.entries(difficultyStats).map(([difficulty, data]) => ({
        difficulty,
        completed: data.completed,
        total: data.total,
        percent: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
