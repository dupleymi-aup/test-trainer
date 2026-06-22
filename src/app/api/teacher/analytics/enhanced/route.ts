import { NextResponse } from "next/server";
import type { StoredTestCase } from "@/lib/evaluator";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { withErrorHandler, parseSearchParams } from "@/lib/api-error-handler";
import { logger } from "@/lib/logger";
import { z } from "zod";

const enhancedParamsSchema = z.object({
  groupId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  taskId: z.string().optional(),
});

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;

    const params = parseSearchParams(req, enhancedParamsSchema);
    if (!params.success) return params.errorResponse;
    const { groupId, startDate, endDate, taskId } = params.data;

  // Build user filter
  let userIds: string[] | undefined;
  if (groupId) {
    const usersInGroup = await db.userGroup.findMany({
      where: { groupId },
      select: { userId: true },
    });
    userIds = usersInGroup.map((u) => u.userId);
  }

  // Fetch attempts with filters
  const attempts = await db.attempt.findMany({
    where: {
      userId: userIds ? { in: userIds } : undefined,
      taskId: taskId || undefined,
      createdAt: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      },
    },
    select: {
      userId: true,
      taskId: true,
      score: true,
      ecCoverage: true,
      bvCoverage: true,
      correctness: true,
      timeSpent: true,
      createdAt: true,
      testCases: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Build task metadata map
  const taskMap = new Map(
    tasks.map((t) => [
      String(t.id),
      { name: t.name, difficulty: t.difficulty, topics: t.topics },
    ])
  );

  // 1. Score Distribution
  const distribution = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
  attempts.forEach((a) => {
    if (a.score <= 20) distribution["0-20"]++;
    else if (a.score <= 40) distribution["21-40"]++;
    else if (a.score <= 60) distribution["41-60"]++;
    else if (a.score <= 80) distribution["61-80"]++;
    else distribution["81-100"]++;
  });

  const scoreDistribution = Object.entries(distribution).map(([range, count]) => ({
    range,
    count,
  }));

  // 2. Task Difficulty
  const taskScores: Record<string, number[]> = {};
  const taskTimes: Record<string, number[]> = {};
  attempts.forEach((a) => {
    if (!taskScores[a.taskId]) {
      taskScores[a.taskId] = [];
      taskTimes[a.taskId] = [];
    }
    taskScores[a.taskId].push(a.score);
    taskTimes[a.taskId].push(a.timeSpent);
  });

  const taskDifficulty = Object.entries(taskScores).map(([tid, scores]) => {
    const meta = taskMap.get(tid);
    return {
      taskId: tid,
      taskName: meta?.name || `Задание ${tid}`,
      difficulty: meta?.difficulty || "Unknown",
      avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      attemptsCount: scores.length,
      avgTimeSpent: Math.round(
        taskTimes[tid].reduce((s, v) => s + v, 0) / taskTimes[tid].length
      ),
    };
  });

  // 3. Topic Performance
  const topicScores: Record<string, number[]> = {};
  const topicEc: Record<string, number[]> = {};
  const topicBv: Record<string, number[]> = {};
  const topicTasks: Record<string, Set<string>> = {};

  attempts.forEach((a) => {
    const meta = taskMap.get(a.taskId);
    if (meta?.topics) {
      meta.topics.forEach((topic) => {
        if (!topicScores[topic]) {
          topicScores[topic] = [];
          topicEc[topic] = [];
          topicBv[topic] = [];
          topicTasks[topic] = new Set();
        }
        topicScores[topic].push(a.score);
        topicEc[topic].push(a.ecCoverage);
        topicBv[topic].push(a.bvCoverage);
        topicTasks[topic].add(a.taskId);
      });
    }
  });

  const topicPerformance = Object.keys(topicScores)
    .map((topic) => ({
      topic,
      avgScore: Math.round(
        topicScores[topic].reduce((s, v) => s + v, 0) / topicScores[topic].length
      ),
      avgEc: Math.round(
        topicEc[topic].reduce((s, v) => s + v, 0) / topicEc[topic].length
      ),
      avgBv: Math.round(
        topicBv[topic].reduce((s, v) => s + v, 0) / topicBv[topic].length
      ),
      taskCount: topicTasks[topic].size,
    }))
    .sort((a, b) => a.avgScore - b.avgScore);

  // 4. Time Trends (weekly aggregation)
  const weeklyData: Record<
    string,
    { scores: number[]; ec: number[]; bv: number[] }
  > = {};
  attempts.forEach((a) => {
    const date = new Date(a.createdAt);
    const _year = date.getFullYear();
    const week = date.toLocaleDateString("en-CA", { timeZone: "UTC" }).slice(0, 7); // YYYY-MM
    const key = week;

    if (!weeklyData[key]) {
      weeklyData[key] = { scores: [], ec: [], bv: [] };
    }
    weeklyData[key].scores.push(a.score);
    weeklyData[key].ec.push(a.ecCoverage);
    weeklyData[key].bv.push(a.bvCoverage);
  });

  const timeTrends = Object.entries(weeklyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      avgScore: Math.round(
        data.scores.reduce((s, v) => s + v, 0) / data.scores.length
      ),
      avgEc: Math.round(data.ec.reduce((s, v) => s + v, 0) / data.ec.length),
      avgBv: Math.round(data.bv.reduce((s, v) => s + v, 0) / data.bv.length),
      attemptCount: data.scores.length,
    }));

  // 5. Category Distribution
  const categoryCounts: Record<string, number> = {
    "Нормальное значение": 0,
    "Граничное значение": 0,
    Исключение: 0,
    "Недопустимый тип": 0,
  };
  let totalCategories = 0;

  attempts.forEach((a) => {
    try {
      const testCases = JSON.parse(a.testCases || "[]");
      if (Array.isArray(testCases)) {
        testCases.forEach((tc: StoredTestCase) => {
          if (tc.category && Object.prototype.hasOwnProperty.call(categoryCounts, tc.category)) {
            categoryCounts[tc.category]++;
            totalCategories++;
          }
        });
      }
    } catch {
      logger.warn("Invalid testCases JSON in enhanced analytics");
    }
  });

  const categoryDistribution = Object.entries(categoryCounts)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalCategories > 0 ? Math.round((count / totalCategories) * 100) : 0,
    }));

  // 6. Overall Stats
  const overallStats = {
    totalAttempts: attempts.length,
    avgScore:
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
        : 0,
    avgEc:
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.ecCoverage, 0) / attempts.length)
        : 0,
    avgBv:
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.bvCoverage, 0) / attempts.length)
        : 0,
    avgCorrectness:
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.correctness, 0) / attempts.length)
        : 0,
    avgTimeSpent:
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.timeSpent, 0) / attempts.length)
        : 0,
  };

  // 7. Group Comparison (only groups owned by the teacher, or all for admin)
  const groupWhere = guard.session.role === "ADMIN"
    ? {}
    : { createdByUserId: guard.session.userId };

  const groups = await db.group.findMany({
    where: groupWhere,
    select: {
      id: true,
      name: true,
      members: {
        select: {
          user: {
            select: {
              id: true,
              attempts: {
                where: {
                  taskId: taskId || undefined,
                  createdAt: {
                    gte: startDate ? new Date(startDate) : undefined,
                    lte: endDate ? new Date(endDate) : undefined,
                  },
                },
                select: {
                  score: true,
                  ecCoverage: true,
                  bvCoverage: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const groupComparison = groups
    .map((g) => {
      const allAttempts = g.members.flatMap((m) => m.user.attempts);
      if (allAttempts.length === 0) return null;

      return {
        groupId: g.id,
        groupName: g.name,
        studentCount: g.members.length,
        avgScore: Math.round(
          allAttempts.reduce((s, a) => s + a.score, 0) / allAttempts.length
        ),
        avgEc: Math.round(
          allAttempts.reduce((s, a) => s + a.ecCoverage, 0) / allAttempts.length
        ),
        avgBv: Math.round(
          allAttempts.reduce((s, a) => s + a.bvCoverage, 0) / allAttempts.length
        ),
        totalAttempts: allAttempts.length,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    scoreDistribution,
    taskDifficulty,
    topicPerformance,
    timeTrends,
    categoryDistribution,
    overallStats,
    groupComparison,
  });
  });
}
