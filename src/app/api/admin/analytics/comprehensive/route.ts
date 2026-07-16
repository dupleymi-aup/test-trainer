import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { parseSearchParams, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { computeTrend } from "@/lib/trend";
import { analyticsParamsSchema } from "@/lib/shared-schemas";

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    unwrapGuard(await requireAdmin());

    const params = parseSearchParams(request, analyticsParamsSchema);
    if (!params.success) return params.errorResponse;
    const { dateFrom, dateTo, groupId, university: universityFilter } = params.data;

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

    // Get filtered student IDs + createdAt (reused later for cohort analysis)
    const filteredStudents = await db.user.findMany({
      where: studentWhere,
      select: { id: true, createdAt: true },
    });
    const filteredStudentIdSet = new Set(filteredStudents.map((s) => s.id));

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

  // Cohort analysis — reuse filteredStudents fetched above (no extra query)
  const studentsWithAttempts = await db.user.findMany({
    where: {
      ...studentWhere,
      attempts: { some: {} },
    },
    select: { id: true, createdAt: true },
  });

  const cohortMap: Record<string, { total: number; withAttempts: number }> = {};
  filteredStudents.forEach((s) => {
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

  // Performance by university — fetch university data and aggregate attempts
  const universityMap: Record<string, { scores: number[]; ecs: number[]; bvs: number[]; attempts: number; students: Set<string> }> = {};

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

  // Teacher leaderboard — 4 simple queries instead of 1 deep nested select
  const teachers = await db.user.findMany({
    where: { role: "TEACHER", deletedAt: null },
    select: { id: true, name: true, email: true },
  });

  const teacherIds = teachers.map((t) => t.id);

  // Fetch groups created by these teachers
  const teacherGroups = teacherIds.length > 0
    ? await db.group.findMany({
        where: { createdByUserId: { in: teacherIds } },
        select: { id: true, createdByUserId: true },
      })
    : [];

  const teacherGroupMap = new Map<string, string[]>();
  for (const g of teacherGroups) {
    const existing = teacherGroupMap.get(g.createdByUserId);
    if (existing) {
      existing.push(g.id);
    } else {
      teacherGroupMap.set(g.createdByUserId, [g.id]);
    }
  }

  const groupIds = teacherGroups.map((g) => g.id);

  // Fetch group members
  const groupMembers = groupIds.length > 0
    ? await db.userGroup.findMany({
        where: { groupId: { in: groupIds } },
        select: { groupId: true, userId: true },
      })
    : [];

  const groupStudentMap = new Map<string, Set<string>>();
  for (const m of groupMembers) {
    const existing = groupStudentMap.get(m.groupId);
    if (existing) {
      existing.add(m.userId);
    } else {
      groupStudentMap.set(m.groupId, new Set([m.userId]));
    }
  }

  // Collect all unique student IDs across all teachers
  const allStudentIds = new Set<string>();
  for (const tg of teacherGroups) {
    const sids = groupStudentMap.get(tg.id);
    if (sids) for (const id of sids) allStudentIds.add(id);
  }

  // Batch fetch all attempts for these students
  const studentAttempts = allStudentIds.size > 0
    ? await db.attempt.findMany({
        where: { userId: { in: [...allStudentIds] } },
        select: { userId: true, score: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  // Build userId -> attempts map
  const studentAttemptsMap = new Map<string, typeof studentAttempts>();
  for (const a of studentAttempts) {
    const existing = studentAttemptsMap.get(a.userId);
    if (existing) {
      existing.push(a);
    } else {
      studentAttemptsMap.set(a.userId, [a]);
    }
  }

  // Pre-compute timestamp threshold for active students check
  const thirtyDaysAgoTime = thirtyDaysAgo.getTime();

  const teacherLeaderboard = teachers
    .map((t) => {
      // Collect attempts with userId tracking
      const allAttempts: Array<{ userId: string; score: number; createdAt: Date }> = [];
      const uniqueStudents = new Set<string>();

      const groupIds = teacherGroupMap.get(t.id) || [];
      for (const gid of groupIds) {
        const sids = groupStudentMap.get(gid);
        if (!sids) continue;
        for (const sid of sids) {
          uniqueStudents.add(sid);
          const attempts = studentAttemptsMap.get(sid);
          if (attempts) {
            for (const a of attempts) {
              allAttempts.push({ userId: sid, score: a.score, createdAt: a.createdAt });
            }
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
        groupsCount: groupIds.length,
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

    if (bestScore < 50) lowPerformers++;
    if (computeTrend(attempts) === "declining") declining++;
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
  });
}
