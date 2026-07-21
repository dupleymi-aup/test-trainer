import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    unwrapGuard(await requireAdmin());

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Database statistics
    const [
      totalUsers,
      usersByRole,
      usersByActive,
      usersThisWeek,
      usersThisMonth,
      totalAttempts,
      attemptsToday,
      attemptsThisWeek,
      attemptsThisMonth,
      totalGroups,
      totalGroupTasks,
      totalActivityLogs,
      totalSettings,
    ] = await Promise.all([
      db.user.count({ where: { deletedAt: null } }),
      db.user.groupBy({
        by: ["role"],
        where: { deletedAt: null },
        _count: true,
      }),
      db.user.groupBy({
        by: ["isActive"],
        where: { deletedAt: null },
        _count: true,
      }),
      db.user.count({
        where: { deletedAt: null, createdAt: { gte: weekAgo } },
      }),
      db.user.count({
        where: { deletedAt: null, createdAt: { gte: monthAgo } },
      }),
      db.attempt.count(),
      db.attempt.count({ where: { createdAt: { gte: today } } }),
      db.attempt.count({ where: { createdAt: { gte: weekAgo } } }),
      db.attempt.count({ where: { createdAt: { gte: monthAgo } } }),
      db.group.count(),
      db.groupTask.count(),
      db.activityLog.count(),
      db.systemSetting.count(),
    ]);

    // Role breakdown
    const roleCounts: Record<string, number> = {};
    usersByRole.forEach((r) => {
      roleCounts[r.role] = r._count;
    });

    // Active/Inactive breakdown
    const activeCounts: Record<string, number> = {};
    usersByActive.forEach((r) => {
      activeCounts[r.isActive ? "active" : "inactive"] = r._count;
    });

    // Attempts distribution by hour of day
    const attemptsByHour = await Promise.all(
      Array.from({ length: 24 }, (_, hour) =>
        db.attempt.count({
          where: {
            createdAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour),
              lt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour + 1),
            },
          },
        }).then((count) => ({ hour, count }))
      )
    );

    // Top tasks by attempts
    const taskAttempts = await db.attempt.groupBy({
      by: ["taskId"],
      _count: true,
      _avg: {
        score: true,
        ecCoverage: true,
        bvCoverage: true,
      },
      orderBy: {
        _count: {
          taskId: "desc",
        },
      },
      take: 10,
    });

    // Recent activity by type
    const activityByType = await db.activityLog.groupBy({
      by: ["action"],
      _count: true,
      orderBy: {
        _count: {
          action: "desc",
        },
      },
      take: 10,
    });

    // Group sizes
    const groupSizes = await db.group.findMany({
      select: {
        id: true,
        name: true,
        members: {
          select: { userId: true },
        },
        assignedTasks: {
          select: { taskId: true },
        },
      },
    });

    const groupStats = groupSizes.map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: g.members.length,
      taskCount: g.assignedTasks.length,
    }));

    // Storage estimation (SQLite doesn't have easy size query, so we estimate)
    const totalRecords = totalUsers + totalAttempts + totalActivityLogs;

    return NextResponse.json({
      database: {
        totalUsers,
        usersByRole: roleCounts,
        usersByStatus: activeCounts,
        usersThisWeek,
        usersThisMonth,
        totalAttempts,
        attemptsToday,
        attemptsThisWeek,
        attemptsThisMonth,
        totalGroups,
        totalGroupTasks,
        totalActivityLogs,
        totalSettings,
        totalRecords,
      },
      attemptsByHour,
      topTasks: taskAttempts.map((t) => ({
        taskId: t.taskId,
        attemptsCount: t._count,
        avgScore: Math.round(t._avg.score ?? 0),
        avgEc: Math.round(t._avg.ecCoverage ?? 0),
        avgBv: Math.round(t._avg.bvCoverage ?? 0),
      })),
      activityByType: activityByType.map((a) => ({
        action: a.action,
        count: a._count,
      })),
      groupStats: groupStats.sort((a, b) => b.memberCount - a.memberCount),
    });
  });
}
