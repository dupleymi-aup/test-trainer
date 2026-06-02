import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import type { StoredTestCase } from "@/lib/evaluator";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const groupId = searchParams.get("groupId");

  // Check cache
  const cacheKey = makeCacheKey("task-insights", { dateFrom, dateTo, groupId });
  const cached = getCache(cacheKey);
  if (cached) return NextResponse.json(cached);

  // If groupId is provided, get student IDs from that group
  let userIdFilter: Record<string, unknown> | undefined;
  if (groupId) {
    const groupMembers = await db.userGroup.findMany({
      where: { groupId },
      select: { userId: true },
    });
    userIdFilter = { in: groupMembers.map((m) => m.userId) };
  }

  // Build attempt filters
  const attemptWhere: Record<string, unknown> = {};
  if (dateFrom || dateTo) {
    const dateCond: Record<string, Date> = {};
    if (dateFrom) dateCond.gte = new Date(dateFrom);
    if (dateTo) dateCond.lte = new Date(dateTo);
    attemptWhere.createdAt = dateCond;
  }
  if (userIdFilter) {
    attemptWhere.userId = userIdFilter;
  }

  const attempts = await db.attempt.findMany({
    where: Object.keys(attemptWhere).length > 0 ? attemptWhere : undefined,
    select: {
      id: true,
      userId: true,
      taskId: true,
      score: true,
      ecCoverage: true,
      bvCoverage: true,
      correctness: true,
      timeSpent: true,
      testCases: true,
    },
  });

  const taskMap = new Map(
    tasks.map((t) => [
      String(t.id),
      {
        name: t.name,
        difficulty: t.difficulty,
        topics: t.topics,
        equivalenceClasses: t.equivalenceClasses.length,
        boundaryValues: t.boundaryValues.length,
      },
    ])
  );

  // Per-task aggregation
  const taskData: Record<
    string,
    {
      scores: number[];
      ecs: number[];
      bvs: number[];
      correctness: number[];
      times: number[];
      categories: Record<string, number>;
      scoreBuckets: Record<string, number>;
    }
  > = {};

  attempts.forEach((a) => {
    if (!taskData[a.taskId]) {
      taskData[a.taskId] = {
        scores: [],
        ecs: [],
        bvs: [],
        correctness: [],
        times: [],
        categories: {},
        scoreBuckets: { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 },
      };
    }

    taskData[a.taskId].scores.push(a.score);
    taskData[a.taskId].ecs.push(a.ecCoverage);
    taskData[a.taskId].bvs.push(a.bvCoverage);
    taskData[a.taskId].correctness.push(a.correctness);
    taskData[a.taskId].times.push(a.timeSpent);

    // Parse testCases for category analysis
    try {
      const testCases = JSON.parse(a.testCases || "[]");
      if (Array.isArray(testCases)) {
        testCases.forEach((tc: StoredTestCase) => {
          if (tc.category) {
            taskData[a.taskId].categories[tc.category] =
              (taskData[a.taskId].categories[tc.category] || 0) + 1;
          }
        });
      }
    } catch {
      logger.warn("Invalid testCases JSON in task-insights analytics", { attemptId: a.id });
    }

    // Score bucket
    if (a.score <= 20) taskData[a.taskId].scoreBuckets["0-20"]++;
    else if (a.score <= 40) taskData[a.taskId].scoreBuckets["21-40"]++;
    else if (a.score <= 60) taskData[a.taskId].scoreBuckets["41-60"]++;
    else if (a.score <= 80) taskData[a.taskId].scoreBuckets["61-80"]++;
    else taskData[a.taskId].scoreBuckets["81-100"]++;
  });

  const taskInsights = Object.entries(taskData)
    .map(([taskId, data]) => {
      const meta = taskMap.get(taskId);
      const avgScore = data.scores.length > 0
        ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length)
        : 0;
      const failRate = data.scores.length > 0
        ? Math.round((data.scores.filter((s) => s < 50).length / data.scores.length) * 100)
        : 0;

      // Difficulty accuracy
      const expectedDifficulty = meta?.difficulty || "Unknown";
      let actualDifficulty: "Легко" | "Средне" | "Сложно" = "Средне";
      if (avgScore >= 75) actualDifficulty = "Легко";
      else if (avgScore >= 50) actualDifficulty = "Средне";
      else actualDifficulty = "Сложно";

      const difficultyAccurate = expectedDifficulty === actualDifficulty;

      // Top categories (mistakes)
      const topCategories = Object.entries(data.categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

      return {
        taskId,
        taskName: meta?.name || `Задание ${taskId}`,
        difficulty: expectedDifficulty,
        actualDifficulty,
        difficultyAccurate,
        attemptsCount: data.scores.length,
        avgScore,
        avgEc: data.ecs.length > 0
          ? Math.round(data.ecs.reduce((s, v) => s + v, 0) / data.ecs.length)
          : 0,
        avgBv: data.bvs.length > 0
          ? Math.round(data.bvs.reduce((s, v) => s + v, 0) / data.bvs.length)
          : 0,
        avgCorrectness: data.correctness.length > 0
          ? Math.round(data.correctness.reduce((s, v) => s + v, 0) / data.correctness.length)
          : 0,
        avgTimeSpent: data.times.length > 0
          ? Math.round(data.times.reduce((s, v) => s + v, 0) / data.times.length)
          : 0,
        failRate,
        scoreDistribution: data.scoreBuckets,
        topCategories,
        topics: meta?.topics || [],
        totalEcs: meta?.equivalenceClasses || 0,
        totalBvs: meta?.boundaryValues || 0,
      };
    })
    .sort((a, b) => b.attemptsCount - a.attemptsCount);

  // Topic performance aggregation
  const topicMap: Record<string, { scores: number[]; ecs: number[]; bvs: number[]; taskCount: Set<string> }> = {};
  attempts.forEach((a) => {
    const meta = taskMap.get(a.taskId);
    if (!meta) return;
    meta.topics.forEach((topic) => {
      if (!topicMap[topic]) {
        topicMap[topic] = { scores: [], ecs: [], bvs: [], taskCount: new Set() };
      }
      topicMap[topic].scores.push(a.score);
      topicMap[topic].ecs.push(a.ecCoverage);
      topicMap[topic].bvs.push(a.bvCoverage);
      topicMap[topic].taskCount.add(a.taskId);
    });
  });

  const topicPerformance = Object.entries(topicMap)
    .map(([topic, data]) => ({
      topic,
      avgScore: data.scores.length > 0
        ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length)
        : 0,
      avgEc: data.ecs.length > 0
        ? Math.round(data.ecs.reduce((s, v) => s + v, 0) / data.ecs.length)
        : 0,
      avgBv: data.bvs.length > 0
        ? Math.round(data.bvs.reduce((s, v) => s + v, 0) / data.bvs.length)
        : 0,
      taskCount: data.taskCount.size,
    }))
    .sort((a, b) => a.avgScore - b.avgScore);

  const result = { taskInsights, topicPerformance };
    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Task insights analytics failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
