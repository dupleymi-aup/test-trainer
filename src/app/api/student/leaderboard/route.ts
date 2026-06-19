import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { parseSearchParams } from "@/lib/api-error-handler";
import { z } from "zod";

const leaderboardParamsSchema = z.object({
  period: z.enum(["all", "week", "month"]).default("all"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1),
  groupId: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;

    const params = parseSearchParams(req, leaderboardParamsSchema);
    if (!params.success) return params.errorResponse;
    const { period, limit, page, groupId } = params.data;

    const now = new Date();
    let dateFrom: Date | undefined;

    if (period === "week") {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    let userIds: string[] | undefined;
    if (groupId) {
      const members = await db.userGroup.findMany({
        where: { groupId },
        select: { userId: true },
      });
      userIds = members.map((m) => m.userId);
      if (userIds.length === 0) {
        return NextResponse.json({ leaderboard: [], totalParticipants: 0, currentUser: null, period, page, totalPages: 0 });
      }
    }

    const whereClause: Record<string, unknown> = {
      ...(dateFrom ? { createdAt: { gte: dateFrom } } : {}),
      ...(userIds ? { userId: { in: userIds } } : {}),
    };

    const attempts = await db.attempt.findMany({
      where: whereClause,
      select: {
        userId: true,
        taskId: true,
        score: true,
        ecCoverage: true,
        bvCoverage: true,
        correctness: true,
        timeSpent: true,
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    const userStats: Record<string, {
      userId: string;
      name: string;
      avatar: string | null;
      totalScore: number;
      avgScore: number;
      bestScore: number;
      totalAttempts: number;
      totalTasks: number;
      avgTime: number;
    }> = {};

    const taskIdsByUser: Record<string, Set<string>> = {};
    const userTimes: Record<string, number[]> = {};

    for (const a of attempts) {
      if (a.score < 0) continue;

      if (!userStats[a.userId]) {
        userStats[a.userId] = {
          userId: a.userId,
          name: a.user.name || "",
          avatar: a.user.avatar,
          totalScore: 0,
          avgScore: 0,
          bestScore: 0,
          totalAttempts: 0,
          totalTasks: 0,
          avgTime: 0,
        };
      }
      const stats = userStats[a.userId];
      stats.totalScore += a.score;
      stats.totalAttempts += 1;
      if (a.score > stats.bestScore) stats.bestScore = a.score;

      if (!taskIdsByUser[a.userId]) taskIdsByUser[a.userId] = new Set();
      taskIdsByUser[a.userId].add(a.taskId);

      if (!userTimes[a.userId]) userTimes[a.userId] = [];
      userTimes[a.userId].push(a.timeSpent);
    }

    for (const key of Object.keys(userStats)) {
      const s = userStats[key];
      s.avgScore = s.totalAttempts > 0 ? Math.round(s.totalScore / s.totalAttempts) : 0;
      s.totalTasks = taskIdsByUser[key]?.size || 0;
      const times = userTimes[key] || [];
      s.avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    }

    const totalParticipants = Object.keys(userStats).length;

    const sortedAll = Object.values(userStats).sort(
      (a, b) => b.avgScore - a.avgScore || b.bestScore - a.bestScore
    );

    const totalPages = Math.max(1, Math.ceil(sortedAll.length / limit));
    const clampedPage = Math.min(page, totalPages);
    const startIdx = (clampedPage - 1) * limit;

    const leaderboard = sortedAll
      .slice(startIdx, startIdx + limit)
      .map((entry, index) => ({
        rank: startIdx + index + 1,
        ...entry,
      }));

    let currentUserRank: { rank: number; stats: typeof userStats[string] } | null = null;
    const currentIndex = sortedAll.findIndex((u) => u.userId === auth.session.userId);
    if (currentIndex >= 0) {
      currentUserRank = { rank: currentIndex + 1, stats: sortedAll[currentIndex] };
    }

    return NextResponse.json({
      leaderboard,
      totalParticipants,
      currentUser: currentUserRank,
      period,
      page: clampedPage,
      totalPages,
      groupId: groupId || null,
    });
  } catch (error) {
    logger.error("Failed to fetch leaderboard", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
