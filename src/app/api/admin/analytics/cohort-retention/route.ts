import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    // Check cache
    const cacheKey = makeCacheKey("cohort-retention");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Get all students with their attempts
    const students = await db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      select: {
        id: true,
        createdAt: true,
        group: true,
        university: true,
        attempts: {
          select: { createdAt: true, score: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group students by registration month (cohort)
    const cohorts: Record<string, { students: number; activeByDay: Record<number, number>; scores: Record<number, number[]> }> = {};

    for (const s of students) {
      const regDate = new Date(s.createdAt);
      const cohortKey = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, "0")}`;

      if (!cohorts[cohortKey]) {
        cohorts[cohortKey] = { students: 0, activeByDay: {}, scores: {} };
      }
      cohorts[cohortKey].students++;

      // Check activity at various intervals (1, 3, 7, 14, 30, 60, 90 days)
      const intervals = [1, 3, 7, 14, 30, 60, 90];
      for (const days of intervals) {
        const cutoff = new Date(regDate);
        cutoff.setDate(cutoff.getDate() + days);

        const activeAttempts = s.attempts.filter((a) => new Date(a.createdAt) >= cutoff);
        if (activeAttempts.length > 0) {
          cohorts[cohortKey].activeByDay[days] = (cohorts[cohortKey].activeByDay[days] || 0) + 1;
          cohorts[cohortKey].scores[days] = activeAttempts.map((a) => a.score);
        }
      }
    }

    // Weekly activity trends (last 12 weeks)
    const now = new Date();
    const weeklyTrends: Array<{ week: string; activeStudents: number; attempts: number; avgScore: number; newStudents: number }> = [];

    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const attempts = await db.attempt.findMany({
        where: { createdAt: { gte: weekStart, lt: weekEnd } },
        select: { userId: true, score: true },
      });

      const newStudents = await db.user.count({
        where: { role: "STUDENT", deletedAt: null, createdAt: { gte: weekStart, lt: weekEnd } },
      });

      const uniqueStudents = new Set(attempts.map((a) => a.userId)).size;
      const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0;

      weeklyTrends.push({
        week: weekStart.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
        activeStudents: uniqueStudents,
        attempts: attempts.length,
        avgScore,
        newStudents,
      });
    }

    // Retention by group
    const groupRetention = await db.group.findMany({
      select: {
        id: true,
        name: true,
        members: {
          select: {
            user: {
              select: {
                id: true,
                createdAt: true,
                attempts: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
              },
            },
          },
        },
      },
    });

    const groupData = groupRetention.map((g) => {
      const total = g.members.length;
      const active = g.members.filter((m) => m.user.attempts.length > 0).length;
      const inactive = total - active;
      return { groupId: g.id, groupName: g.name, total, active, inactive, retentionRate: total > 0 ? Math.round((active / total) * 100) : 0 };
    });

    // Format cohort data for chart
    const cohortChartData = Object.entries(cohorts).map(([cohort, data]) => ({
      cohort,
      students: data.students,
      day1: data.activeByDay[1] || 0,
      day3: data.activeByDay[3] || 0,
      day7: data.activeByDay[7] || 0,
      day14: data.activeByDay[14] || 0,
      day30: data.activeByDay[30] || 0,
      day60: data.activeByDay[60] || 0,
      day90: data.activeByDay[90] || 0,
      retention1: data.activeByDay[1] ? Math.round((data.activeByDay[1] / data.students) * 100) : 0,
      retention7: data.activeByDay[7] ? Math.round((data.activeByDay[7] / data.students) * 100) : 0,
      retention30: data.activeByDay[30] ? Math.round((data.activeByDay[30] / data.students) * 100) : 0,
      retention90: data.activeByDay[90] ? Math.round((data.activeByDay[90] / data.students) * 100) : 0,
    }));

    const result = {
      cohortChartData,
      weeklyTrends,
      groupData: groupData.sort((a, b) => b.retentionRate - a.retentionRate),
      totalStudents: students.length,
      totalCohorts: Object.keys(cohorts).length,
    };

    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("cohort-retention failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
