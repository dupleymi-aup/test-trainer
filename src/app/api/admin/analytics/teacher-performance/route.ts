import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { withErrorHandler } from "@/lib/api-error-handler";

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Check cache
    const cacheKey = makeCacheKey("teacher-performance", { dateFrom, dateTo });
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build date filter for attempts
    const attemptDateFilter: Record<string, Date> = {};
    if (dateFrom) attemptDateFilter.gte = new Date(dateFrom);
    if (dateTo) attemptDateFilter.lte = new Date(dateTo);

    const teachers = await db.user.findMany({
      where: { role: "TEACHER", deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        createdGroups: {
          select: {
            id: true,
            name: true,
            members: {
              select: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    attempts: {
                      where: Object.keys(attemptDateFilter).length > 0 ? { createdAt: attemptDateFilter } : undefined,
                      select: {
                        id: true,
                        score: true,
                        ecCoverage: true,
                        bvCoverage: true,
                        createdAt: true,
                      },
                      orderBy: { createdAt: "asc" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const teacherPerformance = teachers.map((t) => {
      const groups = t.createdGroups.map((g) => {
        const students = g.members.map((m) => {
          const attempts = m.user.attempts;
          const bestScore = attempts.reduce((max, a) => Math.max(max, a.score), 0);
          const avgScore = attempts.length > 0
            ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
            : 0;
          const avgEc = attempts.length > 0
            ? Math.round(attempts.reduce((s, a) => s + a.ecCoverage, 0) / attempts.length)
            : 0;
          const avgBv = attempts.length > 0
            ? Math.round(attempts.reduce((s, a) => s + a.bvCoverage, 0) / attempts.length)
            : 0;
          const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1].createdAt : null;
          const isActive = lastAttempt ? new Date(lastAttempt) >= thirtyDaysAgo : false;

          // Trend calculation
          const first5 = attempts.slice(0, 5);
          const last5 = attempts.slice(-5);
          const firstAvg = first5.length > 0 ? first5.reduce((s, a) => s + a.score, 0) / first5.length : 0;
          const lastAvg = last5.length > 0 ? last5.reduce((s, a) => s + a.score, 0) / last5.length : 0;
          const trend = attempts.length >= 6
            ? lastAvg - firstAvg > 10 ? "improving" : lastAvg - firstAvg < -10 ? "declining" : "stable"
            : "stable";

          return {
            id: m.user.id,
            name: m.user.name || m.user.email || "Unknown",
            attemptsCount: attempts.length,
            bestScore,
            avgScore,
            avgEc,
            avgBv,
            isActive,
            trend,
          };
        });

        const activeStudents = students.filter((s) => s.isActive).length;
        const inactiveStudents = students.length - activeStudents;
        const allScores = students.flatMap((s) => s.attemptsCount > 0 ? [s.avgScore] : []);
        const avgGroupScore = allScores.length > 0 ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length) : 0;

        return {
          id: g.id,
          name: g.name,
          studentCount: students.length,
          activeStudents,
          inactiveStudents,
          avgScore: avgGroupScore,
          students,
        };
      });

      const allStudents = groups.flatMap((g) => g.students);
      const totalStudents = allStudents.length;
      const totalAttempts = allStudents.reduce((s, st) => s + st.attemptsCount, 0);
      const avgStudentScore = allStudents.filter((s) => s.attemptsCount > 0).length > 0
        ? Math.round(
            allStudents
              .filter((s) => s.attemptsCount > 0)
              .reduce((s, st) => s + st.avgScore, 0) /
              allStudents.filter((s) => s.attemptsCount > 0).length
          )
        : 0;
      const activeStudentsRate = totalStudents > 0
        ? Math.round((allStudents.filter((s) => s.isActive).length / totalStudents) * 100)
        : 0;

      // Overall trend for teacher
      const allStudentScores = allStudents
        .filter((s) => s.attemptsCount > 0)
        .map((s) => s.avgScore);
      const overallTrend = allStudentScores.length > 5
        ? allStudentScores.slice(-5).reduce((s, v) => s + v, 0) / 5 -
            allStudentScores.slice(0, 5).reduce((s, v) => s + v, 0) / 5 > 5
          ? "improving"
          : allStudentScores.slice(-5).reduce((s, v) => s + v, 0) / 5 -
              allStudentScores.slice(0, 5).reduce((s, v) => s + v, 0) / 5 < -5
            ? "declining"
            : "stable"
        : "stable";

      return {
        teacherId: t.id,
        name: t.name || t.email || "Unknown",
        email: t.email,
        groupsCount: groups.length,
        studentsCount: totalStudents,
        avgStudentScore,
        avgAttemptsPerStudent: totalStudents > 0 ? Math.round(totalAttempts / totalStudents) : 0,
        activeStudentsRate,
        trend: overallTrend,
        totalAttempts,
        groups,
      };
    });

    const result = { teachers: teacherPerformance };
    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
