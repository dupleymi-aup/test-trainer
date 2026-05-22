import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { logger } from "@/lib/logger";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

export async function GET(request: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const groupId = searchParams.get("groupId");
    const universityFilter = searchParams.get("university");

    // Check cache
    const cacheKey = makeCacheKey("comprehensive", { dateFrom, dateTo, groupId, universityFilter });
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // If groupId is provided, get student IDs from that group
    let userIdFilter: Set<string> | null = null;
    if (groupId) {
      const groupMembers = await db.userGroup.findMany({
        where: { groupId },
        select: { userId: true },
      });
      userIdFilter = new Set(groupMembers.map((m) => m.userId));
    }

    // Build student filter
    const studentWhere: Record<string, unknown> = { role: "STUDENT", deletedAt: null };
    if (userIdFilter) studentWhere.id = { in: [...userIdFilter] };
    if (universityFilter) studentWhere.university = universityFilter;

    // Get filtered student IDs for active students check
    const filteredStudentIds = await db.user.findMany({
      where: studentWhere,
      select: { id: true },
    });
    const filteredStudentIdSet = new Set(filteredStudentIds.map((s) => s.id));

    // Build attempt where clause
    const attemptWhere: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      const dateCond: Record<string, Date> = {};
      if (dateFrom) dateCond.gte = new Date(dateFrom);
      if (dateTo) dateCond.lte = new Date(dateTo);
      attemptWhere.createdAt = dateCond;
    }
    if (userIdFilter) {
      attemptWhere.userId = { in: [...userIdFilter] };
    }

    // KPI metrics — limit attempts to last 10000 to prevent memory issues
    const [totalStudents, totalTeachers, totalGroups, allAttempts, activeStudents30d] =
      await Promise.all([
        db.user.count({ where: studentWhere }),
        db.user.count({ where: { role: "TEACHER", deletedAt: null } }),
        db.group.count(),
        db.attempt.findMany({
          where: Object.keys(attemptWhere).length > 0 ? attemptWhere : undefined,
          select: { score: true, ecCoverage: true, bvCoverage: true, userId: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10_000,
        }),
        db.user.count({
          where: {
            role: "STUDENT",
            deletedAt: null,
            id: { in: [...filteredStudentIdSet] },
            attempts: { some: dateFrom || dateTo ? { createdAt: { gte: thirtyDaysAgo } } : undefined },
          },
        }),
      ]);

    // Pre-build userId -> attempts map for reuse across all sections
    const userAttemptsMap: Record<string, typeof allAttempts> = {};
    allAttempts.forEach((a) => {
      if (!userAttemptsMap[a.userId]) userAttemptsMap[a.userId] = [];
      userAttemptsMap[a.userId].push(a);
    });

  // Score trends (monthly for last 12 months)
  const monthlyTrendsMap: Record<string, { totalScore: number; totalEc: number; totalBv: number; count: number }> = {};
  allAttempts.forEach((a) => {
    const month = a.createdAt.toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyTrendsMap[month]) monthlyTrendsMap[month] = { totalScore: 0, totalEc: 0, totalBv: 0, count: 0 };
    monthlyTrendsMap[month].totalScore += a.score;
    monthlyTrendsMap[month].totalEc += a.ecCoverage;
    monthlyTrendsMap[month].totalBv += a.bvCoverage;
    monthlyTrendsMap[month].count++;
  });

  const scoreTrends = Object.entries(monthlyTrendsMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({
      month,
      avgScore: Math.round(data.totalScore / data.count),
      avgEc: Math.round(data.totalEc / data.count),
      avgBv: Math.round(data.totalBv / data.count),
      attemptsCount: data.count,
    }));

  // Cohort analysis (by registration month) — run both queries in parallel
  const [students, studentsWithAttempts] = await Promise.all([
    db.user.findMany({
      where: studentWhere,
      select: { id: true, createdAt: true },
    }),
    db.user.findMany({
      where: {
        ...studentWhere,
        attempts: { some: {} },
      },
      select: { id: true, createdAt: true },
    }),
  ]);

  const cohortMap: Record<string, { total: number; withAttempts: number }> = {};
  students.forEach((s) => {
    const cohort = s.createdAt.toISOString().slice(0, 7);
    if (!cohortMap[cohort]) cohortMap[cohort] = { total: 0, withAttempts: 0 };
    cohortMap[cohort].total++;
  });

  studentsWithAttempts.forEach((s) => {
    const cohort = s.createdAt.toISOString().slice(0, 7);
    if (cohortMap[cohort]) cohortMap[cohort].withAttempts++;
  });

  const cohortAnalysis = Object.entries(cohortMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      totalStudents: data.total,
      withAttempts: data.withAttempts,
      activationRate: data.total > 0 ? Math.round((data.withAttempts / data.total) * 100) : 0,
    }));

  // Performance by university
  const universityMap: Record<string, { scores: number[]; ecs: number[]; bvs: number[]; attempts: number; students: Set<string> }> = {};
  allAttempts.forEach((a) => {
    // We need user.university - fetch it separately
  });

  const usersWithUniversity = await db.user.findMany({
    where: { role: "STUDENT", deletedAt: null, university: { not: "" } },
    select: { id: true, university: true },
  });

  const userIdToUniversity = new Map(usersWithUniversity.map((u) => [u.id, u.university]));

  allAttempts.forEach((a) => {
    const uni = userIdToUniversity.get(a.userId);
    if (!uni) return;
    if (!universityMap[uni]) universityMap[uni] = { scores: [], ecs: [], bvs: [], attempts: 0, students: new Set() };
    universityMap[uni].scores.push(a.score);
    universityMap[uni].ecs.push(a.ecCoverage);
    universityMap[uni].bvs.push(a.bvCoverage);
    universityMap[uni].attempts++;
    universityMap[uni].students.add(a.userId);
  });

  const universityPerformance = Object.entries(universityMap)
    .map(([name, data]) => ({
      university: name,
      studentCount: data.students.size,
      avgScore: data.scores.length > 0 ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length) : 0,
      avgEc: data.ecs.length > 0 ? Math.round(data.ecs.reduce((s, v) => s + v, 0) / data.ecs.length) : 0,
      avgBv: data.bvs.length > 0 ? Math.round(data.bvs.reduce((s, v) => s + v, 0) / data.bvs.length) : 0,
      totalAttempts: data.attempts,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // Teacher leaderboard
  const teachers = await db.user.findMany({
    where: { role: "TEACHER", deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      createdGroups: {
        select: {
          id: true,
          members: {
            select: {
              user: {
                select: {
                  id: true,
                  attempts: {
                    select: { score: true, ecCoverage: true, bvCoverage: true, createdAt: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Pre-compute timestamp threshold for active students check
  const thirtyDaysAgoTime = thirtyDaysAgo.getTime();

  const teacherLeaderboard = teachers
    .map((t) => {
      // Collect attempts with userId tracking
      const allAttempts: Array<{ userId: string; score: number; ecCoverage: number; bvCoverage: number; createdAt: Date }> = [];
      const uniqueStudents = new Set<string>();

      for (const g of t.createdGroups) {
        for (const m of g.members) {
          uniqueStudents.add(m.user.id);
          for (const a of m.user.attempts) {
            allAttempts.push({ userId: m.user.id, ...a });
          }
        }
      }

      const avgScore = allAttempts.length > 0
        ? Math.round(allAttempts.reduce((s, a) => s + a.score, 0) / allAttempts.length)
        : 0;

      // Pre-group attempts by userId for O(1) lookup
      const attemptsByStudent: Record<string, typeof allAttempts> = {};
      for (const a of allAttempts) {
        if (!attemptsByStudent[a.userId]) attemptsByStudent[a.userId] = [];
        attemptsByStudent[a.userId].push(a);
      }

      // Calculate trend (first 10 vs last 10 attempts) — sort once by pre-parsed timestamps
      const sorted = [...allAttempts].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );
      const first10 = sorted.slice(0, 10);
      const last10 = sorted.slice(-10);
      const firstAvg = first10.length > 0 ? first10.reduce((s, a) => s + a.score, 0) / first10.length : 0;
      const lastAvg = last10.length > 0 ? last10.reduce((s, a) => s + a.score, 0) / last10.length : 0;
      const trend = lastAvg - firstAvg > 5 ? "improving" : lastAvg - firstAvg < -5 ? "declining" : "stable";

      // Count inactive students using pre-grouped attempts
      let inactiveCount = 0;
      for (const sid of uniqueStudents) {
        const studentAttempts = attemptsByStudent[sid] || [];
        if (studentAttempts.length === 0 || studentAttempts[studentAttempts.length - 1].createdAt.getTime() < thirtyDaysAgoTime) {
          inactiveCount++;
        }
      }

      return {
        teacherId: t.id,
        name: t.name || t.email || "Unknown",
        groupsCount: t.createdGroups.length,
        studentsCount: uniqueStudents.size,
        avgStudentScore: avgScore,
        avgAttemptsPerStudent: uniqueStudents.size > 0 ? Math.round(allAttempts.length / uniqueStudents.size) : 0,
        activeStudentsRate: uniqueStudents.size > 0
          ? Math.round(((uniqueStudents.size - inactiveCount) / uniqueStudents.size) * 100)
          : 0,
        trend,
        totalAttempts: allAttempts.length,
      };
    })
    .filter((t) => t.studentsCount > 0)
    .sort((a, b) => b.avgStudentScore - a.avgStudentScore);

  // Risk overview — reuse the userAttemptsMap built earlier (no need to fetch attempts again)
  const fourteenDaysAgoTime = new Date(now);
  fourteenDaysAgoTime.setDate(fourteenDaysAgoTime.getDate() - 14);
  const sevenDaysAgoTime = new Date(now);
  sevenDaysAgoTime.setDate(sevenDaysAgoTime.getDate() - 7);

  let lowPerformers = 0;
  let declining = 0;
  let inactive = 0;
  let lowEngagement = 0;

  // Batch fetch user createdAt for all users with < 3 attempts (fix N+1)
  const lowAttemptUserIds = Object.entries(userAttemptsMap)
    .filter(([, attempts]) => attempts.length < 3)
    .map(([userId]) => userId);

  const userCreationDates = new Map<string, Date>();
  if (lowAttemptUserIds.length > 0) {
    const users = await db.user.findMany({
      where: { id: { in: lowAttemptUserIds } },
      select: { id: true, createdAt: true },
    });
    users.forEach((u) => userCreationDates.set(u.id, u.createdAt));
  }

  for (const [userId, attempts] of Object.entries(userAttemptsMap)) {
    if (attempts.length === 0) continue;

    const bestScore = attempts.reduce((max, a) => Math.max(max, a.score), 0);
    const lastAttempt = attempts[attempts.length - 1];
    const lastAttemptTime = lastAttempt.createdAt.getTime();
    const first3 = attempts.slice(0, 3);
    const last3 = attempts.slice(-3);
    const first3Avg = first3.reduce((s, a) => s + a.score, 0) / first3.length;
    const last3Avg = last3.reduce((s, a) => s + a.score, 0) / last3.length;

    if (bestScore < 50) lowPerformers++;
    if (attempts.length >= 6 && first3Avg - last3Avg > 15) declining++;
    if (lastAttemptTime < fourteenDaysAgoTime.getTime()) inactive++;
    if (attempts.length < 3) {
      const createdAt = userCreationDates.get(userId);
      if (createdAt && createdAt.getTime() < sevenDaysAgoTime.getTime()) lowEngagement++;
    }
  }

  const avgPlatformScore = allAttempts.length > 0
    ? Math.round(allAttempts.reduce((s, a) => s + a.score, 0) / allAttempts.length)
    : 0;

    const result = {
    kpi: {
      totalStudents,
      totalTeachers,
      totalGroups,
      avgPlatformScore,
      activeStudents30d,
      activeRate: totalStudents > 0 ? Math.round((activeStudents30d / totalStudents) * 100) : 0,
    },
    scoreTrends,
    cohortAnalysis,
    universityPerformance,
    teacherLeaderboard,
    riskOverview: {
      lowPerformers,
      declining,
      inactive,
      lowEngagement,
      total: lowPerformers + declining + inactive + lowEngagement,
    },
  };

    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to fetch comprehensive analytics", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch comprehensive analytics" }, { status: 500 });
  }
}
