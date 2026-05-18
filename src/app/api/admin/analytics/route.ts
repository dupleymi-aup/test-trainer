import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Platform Engagement
  const [dau, wau, mau, newUsersWeek, newUsersMonth] = await Promise.all([
    db.attempt.findMany({
      where: { createdAt: { gte: today } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    db.attempt.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    db.attempt.findMany({
      where: { createdAt: { gte: monthAgo } },
      select: { userId: true },
      distinct: ["userId"],
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

  // Attempt Volume (last 30 days, daily)
  const attempts30Days = await db.attempt.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      score: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const volumeMap: Record<string, { count: number; totalScore: number }> = {};
  attempts30Days.forEach((a) => {
    const date = a.createdAt.toISOString().split("T")[0];
    if (!volumeMap[date]) {
      volumeMap[date] = { count: 0, totalScore: 0 };
    }
    volumeMap[date].count++;
    volumeMap[date].totalScore += a.score;
  });

  const attemptVolume = Object.entries(volumeMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      count: data.count,
      avgScore: Math.round(data.totalScore / data.count),
    }));

  // Performance Distribution
  const allAttempts = await db.attempt.findMany({
    select: { score: true },
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

  // Group Performance
  const groups = await db.group.findMany({
    select: {
      id: true,
      name: true,
      members: {
        select: {
          user: {
            select: {
              attempts: {
                select: {
                  score: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const groupPerformance = groups
    .map((g) => {
      const allGroupAttempts = g.members.flatMap(
        (m) => m.user.attempts
      );
      if (allGroupAttempts.length === 0) return null;

      return {
        groupId: g.id,
        groupName: g.name,
        avgScore: Math.round(
          allGroupAttempts.reduce((s, a) => s + a.score, 0) /
            allGroupAttempts.length
        ),
        studentCount: g.members.length,
        totalAttempts: allGroupAttempts.length,
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

  // Task Difficulty
  const taskScores: Record<string, number[]> = {};
  allAttempts.forEach((a) => {
    if (!taskScores[a.taskId]) taskScores[a.taskId] = [];
    taskScores[a.taskId].push(a.score);
  });

  const taskMap = new Map(
    tasks.map((t) => [String(t.id), { name: t.name, difficulty: t.difficulty }])
  );

  const taskDifficulty = Object.entries(taskScores).map(([tid, scores]) => {
    const meta = taskMap.get(tid);
    return {
      taskId: tid,
      taskName: meta?.name || `Задание ${tid}`,
      avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      attemptsCount: scores.length,
      difficulty: meta?.difficulty || "Unknown",
    };
  });

  // Retention Metrics
  const [totalStudents, studentsWithAttempts, studentsWithoutAttempts] =
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

  return NextResponse.json({
    platformEngagement: {
      dau: dau.length,
      wau: wau.length,
      mau: mau.length,
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
          ? Math.round(allAttempts.length / studentsWithAttempts)
          : 0,
      inactive30Days,
    },
  });
  } catch (error) {
    logger.error("Failed to fetch admin analytics", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
