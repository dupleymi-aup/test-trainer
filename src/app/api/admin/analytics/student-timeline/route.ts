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
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const cacheKey = makeCacheKey("student-timeline", { studentId });
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const student = await db.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true, university: true, group: true, createdAt: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const attempts = await db.attempt.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: "asc" },
    });

    const scoreTrajectory = attempts.map((a, i) => ({
      index: i + 1,
      score: a.score,
      ecCoverage: a.ecCoverage,
      bvCoverage: a.bvCoverage,
      date: a.createdAt.toISOString().split("T")[0],
    }));

    // Milestones
    const milestones: { label: string; index: number; score: number; date: string }[] = [];
    let firstAttempt = false;
    let first50 = false;
    let first75 = false;
    let bestScore = 0;
    let bestIndex = -1;

    for (let i = 0; i < attempts.length; i++) {
      const a = attempts[i];
      if (!firstAttempt) {
        milestones.push({ label: "Первая попытка", index: i + 1, score: a.score, date: a.createdAt.toISOString().split("T")[0] });
        firstAttempt = true;
      }
      if (!first50 && a.score >= 50) {
        milestones.push({ label: "Первые 50%", index: i + 1, score: a.score, date: a.createdAt.toISOString().split("T")[0] });
        first50 = true;
      }
      if (!first75 && a.score >= 75) {
        milestones.push({ label: "Первые 75%", index: i + 1, score: a.score, date: a.createdAt.toISOString().split("T")[0] });
        first75 = true;
      }
      if (a.score > bestScore) {
        bestScore = a.score;
        bestIndex = i;
      }
    }
    if (bestIndex >= 0) {
      milestones.push({ label: "Лучший результат", index: bestIndex + 1, score: bestScore, date: attempts[bestIndex].createdAt.toISOString().split("T")[0] });
    }

    // Topic progression
    const topicScores: Record<string, { total: number; count: number }> = {};
    for (const a of attempts) {
      const task = tasks.find((t) => String(t.id) === a.taskId);
      if (task) {
        for (const topic of task.topics) {
          if (!topicScores[topic]) topicScores[topic] = { total: 0, count: 0 };
          topicScores[topic].total += a.score;
          topicScores[topic].count++;
        }
      }
    }
    const topicProgression = Object.entries(topicScores).map(([topic, data]) => ({
      topic,
      avgScore: Math.round(data.total / data.count),
      attempts: data.count,
    }));

    const result = {
      student,
      attempts: attempts.map((a) => ({
        id: a.id,
        taskId: a.taskId,
        taskName: tasks.find((t) => String(t.id) === a.taskId)?.name || `Задание ${a.taskId}`,
        score: a.score,
        ecCoverage: a.ecCoverage,
        bvCoverage: a.bvCoverage,
        timeSpent: a.timeSpent,
        date: a.createdAt.toISOString().split("T")[0],
      })),
      scoreTrajectory,
      milestones,
      topicProgression,
    };

    setCache(cacheKey, result, DEFAULT_TTL.medium);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to fetch student timeline", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch student timeline" }, { status: 500 });
  }
}
