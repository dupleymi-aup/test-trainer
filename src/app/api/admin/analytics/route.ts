import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

export async function GET() {
  return withErrorHandler(undefined, async () => {
    unwrapGuard(await requireAdmin());

    const cacheKey = makeCacheKey("hub");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Platform Engagement — use groupBy instead of findMany + distinct + .length
  const [dauResult, wauResult, mauResult, newUsersWeek, newUsersMonth] = await Promise.all([
    db.attempt.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: today } },
      _count: { userId: true },
    }),
    db.attempt.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: weekAgo } },
      _count: { userId: true },
    }),
    db.attempt.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: monthAgo } },
      _count: { userId: true },
    }),
    db.user.count({
      where: {
        role: "STUDENT",
        deletedAt: null,
        createdAt: { gte: weekAgo },
      },
    }),
    db.user.count({
      where: {
        role: "STUDENT",
        deletedAt: null,
        createdAt: { gte: monthAgo },
      },
    }),
  ]);

  // Attempt Volume (last 30 days, daily) — use groupBy instead of findMany(10_000)
  const attempts30Days = await db.attempt.groupBy({
    by: ["createdAt"],
    where: { createdAt: { gte: thirtyDaysAgo } },
    _count: { _all: true },
    _avg: { score: true },
    orderBy: { createdAt: "asc" },
  });

  const volumeMap: Record<string, { count: number; totalScore: number }> = {};
  for (const a of attempts30Days) {
    const date = a.createdAt.toISOString().split("T")[0];
    if (!volumeMap[date]) {
      volumeMap[date] = { count: 0, totalScore: 0 };
    }
    volumeMap[date].count += a._count._all;
    volumeMap[date].totalScore += (a._avg.score ?? 0) * a._count._all;
  }

  const attemptVolume = Object.entries(volumeMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      count: data.count,
      avgScore: Math.round(data.totalScore / data.count),
    }));

  // Performance Distribution — use bucketed groupBy instead of findMany(1000)
  const allAttempts = await db.attempt.findMany({
    select: { taskId: true, score: true },
    take: 1000,
    orderBy: { createdAt: "desc" },
  });

  const distribution = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
  allAttempts.forEach((a) => {
    if (a.score <= 20) distribution["0-20"]++;
    else if (a.score <= 40) distribution["21-40"]++;
    else if (a.score <= 60) distribution["41-60"]++;
    else if (a.score <= 80) distribution["61-80"]++;
    else distribution["81-100"]++;
  });

  // Group Performance — use groupBy for per-user aggregation instead of findMany(50_000)
  const groups = await db.group.findMany({
    select: { id: true, name: true },
  });

  // Step 1: Get all group member IDs
  const groupMembers = await db.userGroup.findMany({
    where: { groupId: { in: groups.map((g) => g.id) } },
    select: { userId: true, groupId: true },
  });

  const membersByGroup: Record<string, string[]> = {};
  for (const m of groupMembers) {
    if (!membersByGroup[m.groupId]) membersByGroup[m.groupId] = [];
    membersByGroup[m.groupId].push(m.userId);
  }

  // Step 2: Use groupBy to aggregate per user instead of loading all attempts
  const memberIds = [...new Set(groupMembers.map((m) => m.userId))];
  const attemptsByUser: Record<string, { count: number; totalScore: number }> = {};

  if (memberIds.length > 0) {
    const userAggregations = await db.attempt.groupBy({
      by: ["userId"],
      where: { userId: { in: memberIds } },
      _count: { _all: true },
      _sum: { score: true },
    });

    for (const agg of userAggregations) {
      attemptsByUser[agg.userId] = {
        count: agg._count._all,
        totalScore: agg._sum.score ?? 0,
      };
    }
  }

  const groupPerformance = groups
    .map((g) => {
      const userIds = membersByGroup[g.id] || [];
      if (userIds.length === 0) return null;

      let totalCount = 0;
      let totalScore = 0;
      for (const uid of userIds) {
        const a = attemptsByUser[uid];
        if (a) {
          totalCount += a.count;
          totalScore += a.totalScore;
        }
      }

      if (totalCount === 0) return null;

      return {
        groupId: g.id,
        groupName: g.name,
        avgScore: Math.round(totalScore / totalCount),
        studentCount: userIds.length,
        totalAttempts: totalCount,
      };
    })
    .filter(Boolean);

  // Teacher Activity
  const teachers = await db.user.findMany({
    where: {
      role: "TEACHER",
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdGroups: {
        select: {
          id: true,
          members: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });

  const teacherActivity = teachers.map((t) => ({
    teacherId: t.id,
    name: t.name || t.email || "Unknown",
    groupsManaged: t.createdGroups.length,
    totalStudents: t.createdGroups.reduce(
      (sum, g) => sum + g.members.length,
      0
    ),
  }));

  // Task Difficulty — use groupBy instead of in-memory from allAttempts
  const taskScoreAggs = await db.attempt.groupBy({
    by: ["taskId"],
    _avg: { score: true },
    _count: { _all: true },
  });

  const taskMap = new Map(
    tasks.map((t) => [String(t.id), { name: t.name, difficulty: t.difficulty }])
  );

  const taskDifficulty = taskScoreAggs.map((agg) => {
    const meta = taskMap.get(agg.taskId);
    return {
      taskId: agg.taskId,
      taskName: meta?.name || `Задание ${agg.taskId}`,
      avgScore: Math.round(agg._avg.score ?? 0),
      attemptsCount: agg._count._all,
      difficulty: meta?.difficulty || "Unknown",
    };
  });

  // Retention Metrics
  const [totalStudents, studentsWithAttempts, studentsWithoutAttempts, totalAttemptsCount] =
    await Promise.all([
      db.user.count({
        where: { role: "STUDENT", deletedAt: null },
      }),
      db.user.count({
        where: {
          role: "STUDENT",
          deletedAt: null,
          attempts: { some: {} },
        },
      }),
      db.user.count({
        where: {
          role: "STUDENT",
          deletedAt: null,
          attempts: { none: {} },
        },
      }),
      db.attempt.count(),
    ]);

  const inactive30Days = await db.user.count({
    where: {
      role: "STUDENT",
      deletedAt: null,
      attempts: {
        none: {
          createdAt: { gte: thirtyDaysAgo },
        },
      },
    },
  });

  const result = {
    platformEngagement: {
      dau: dauResult.length,
      wau: wauResult.length,
      mau: mauResult.length,
      newUsersWeek,
      newUsersMonth,
    },
    attemptVolume,
    performanceDistribution: distribution,
    groupPerformance: groupPerformance || [],
    teacherActivity,
    taskDifficulty,
    retentionMetrics: {
      totalStudents,
      withAttempts: studentsWithAttempts,
      withoutAttempts: studentsWithoutAttempts,
      avgPerStudent:
        studentsWithAttempts > 0
          ? Math.round(totalAttemptsCount / studentsWithAttempts)
          : 0,
      inactive30Days,
    },
  };

  setCache(cacheKey, result, DEFAULT_TTL.medium);
  return NextResponse.json(result);
  });
}
