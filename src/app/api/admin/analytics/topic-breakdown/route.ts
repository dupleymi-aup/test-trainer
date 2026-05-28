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
    const groupId = searchParams.get("groupId");
    const university = searchParams.get("university");

    const cacheKey = makeCacheKey("topic-breakdown", { groupId: groupId || "", university: university || "" });
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Build where clause
    const whereClause: Record<string, unknown> = {};
    if (groupId) {
      const group = await db.group.findUnique({
        where: { id: groupId },
        select: { members: { select: { userId: true } } },
      });
      if (group) {
        whereClause.userId = { in: group.members.map((m) => m.userId) };
      }
    } else if (university) {
      const students = await db.user.findMany({
        where: { university, role: "STUDENT", deletedAt: null },
        select: { id: true },
      });
      whereClause.userId = { in: students.map((s) => s.id) };
    }

    const attempts = await db.attempt.findMany({
      where: whereClause as object,
      take: 50_000,
      orderBy: { createdAt: "asc" },
      select: {
        taskId: true,
        score: true,
        ecCoverage: true,
        bvCoverage: true,
        timeSpent: true,
        createdAt: true,
        coveredEcIds: true,
      },
    });

    // Group by topic
    const topicData: Record<string, { scores: number[]; ecCoverages: number[]; bvCoverages: number[]; timeSpent: number[]; dates: string[] }> = {};

    for (const a of attempts) {
      const task = tasks.find((t) => String(t.id) === a.taskId);
      const date = a.createdAt.toISOString().split("T")[0];
      if (task) {
        for (const topic of task.topics) {
          if (!topicData[topic]) {
            topicData[topic] = { scores: [], ecCoverages: [], bvCoverages: [], timeSpent: [], dates: [] };
          }
          topicData[topic].scores.push(a.score);
          topicData[topic].ecCoverages.push(a.ecCoverage);
          topicData[topic].bvCoverages.push(a.bvCoverage);
          topicData[topic].timeSpent.push(a.timeSpent);
          topicData[topic].dates.push(date);
        }
      }
    }

    const topics = Object.entries(topicData).map(([topic, data]) => ({
      topic,
      avgScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
      avgEcCoverage: Math.round(data.ecCoverages.reduce((s, v) => s + v, 0) / data.ecCoverages.length),
      avgBvCoverage: Math.round(data.bvCoverages.reduce((s, v) => s + v, 0) / data.bvCoverages.length),
      avgTimeSpent: Math.round(data.timeSpent.reduce((s, v) => s + v, 0) / data.timeSpent.length),
      attemptsCount: data.scores.length,
      trend: computeTrend(data.scores),
    }));

    // Subtopic breakdown: EC/BV per topic
    const subtopics: Record<string, { id: string; name: string; missRate: number; attempts: number }[]> = {};
    for (const topic of topics) {
      const topicTasks = tasks.filter((t) => t.topics.includes(topic.topic));
      subtopics[topic.topic] = topicTasks.flatMap((t) =>
        t.equivalenceClasses.map((ec) => ({
          id: ec.id,
          name: ec.name,
          missRate: computeMissRate(attempts, t.id, ec.id),
          attempts: countAttemptsForTask(attempts, t.id),
        }))
      );
    }

    // Time spent per topic over time
    const timePerTopic: Record<string, { date: string; totalTime: number; avgScore: number }[]> = {};
    for (const [topic, data] of Object.entries(topicData)) {
      const dateMap: Record<string, { time: number; scores: number[] }> = {};
      for (let i = 0; i < data.dates.length; i++) {
        const d = data.dates[i];
        if (!dateMap[d]) dateMap[d] = { time: 0, scores: [] };
        dateMap[d].time += data.timeSpent[i];
        dateMap[d].scores.push(data.scores[i]);
      }
      timePerTopic[topic] = Object.entries(dateMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, d]) => ({
          date,
          totalTime: Math.round(d.time / 60), // minutes
          avgScore: Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length),
        }));
    }

    const result = { topics, subtopics, timePerTopic };
    setCache(cacheKey, result, DEFAULT_TTL.medium);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to fetch topic breakdown", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch topic breakdown" }, { status: 500 });
  }
}

function computeTrend(scores: number[]): "improving" | "declining" | "stable" {
  if (scores.length < 3) return "stable";
  const first3 = scores.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
  const last3 = scores.slice(-3).reduce((s, v) => s + v, 0) / 3;
  const delta = last3 - first3;
  return delta > 10 ? "improving" : delta < -10 ? "declining" : "stable";
}

function computeMissRate(attempts: { taskId: string; coveredEcIds: string }[], taskId: number, ecId: string): number {
  const relevant = attempts.filter((a) => String(a.taskId) === String(taskId));
  if (relevant.length === 0) return 100;
  const missed = relevant.filter((a) => {
    try {
      const covered = JSON.parse(a.coveredEcIds || "[]") as string[];
      return !covered.includes(ecId);
    } catch {
      return true;
    }
  }).length;
  return Math.round((missed / relevant.length) * 100);
}

function countAttemptsForTask(attempts: { taskId: string }[], taskId: number): number {
  return attempts.filter((a) => String(a.taskId) === String(taskId)).length;
}
