import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { logger } from "@/lib/logger";
import { parseSearchParams } from "@/lib/api-error-handler";
import { dateRangeSchema, groupFilterSchema } from "@/lib/shared-schemas";

const universityParamsSchema = dateRangeSchema.merge(groupFilterSchema);

export async function GET(request: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const params = parseSearchParams(request, universityParamsSchema);
    if (!params.success) return params.errorResponse;
    const { dateFrom, dateTo, groupId } = params.data;

    // Check cache
    const cacheKey = makeCacheKey("university-comparison", { dateFrom, dateTo, groupId });
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // If groupId is provided, get student IDs from that group
    let userIdFilter: Set<string> | null = null;
    if (groupId) {
      const groupMembers = await db.userGroup.findMany({
        where: { groupId },
        select: { userId: true },
      });
      userIdFilter = new Set(groupMembers.map((m) => m.userId));
    }

    // Get all students with university field
    const students = await db.user.findMany({
      where: { role: "STUDENT", deletedAt: null, university: { not: "" } },
      select: { id: true, university: true },
    });

    const userIdToUniversity = new Map(
      students.filter((s) => !userIdFilter || userIdFilter.has(s.id)).map((s) => [s.id, s.university])
    );

    // Build date filter for attempts
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

    // Get all attempts with filters
    const attempts = await db.attempt.findMany({
      where: attemptWhere,
      select: {
        userId: true,
        taskId: true,
        score: true,
        ecCoverage: true,
        bvCoverage: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10_000,
    });

    // Aggregate by university
    const universityMap: Record<
      string,
      {
        scores: number[];
        ecs: number[];
        bvs: number[];
        students: Set<string>;
        taskScores: Record<string, number[]>;
        monthlyScores: Record<string, number[]>;
      }
    > = {};

    attempts.forEach((a) => {
      const uni = userIdToUniversity.get(a.userId);
      if (!uni) return;

      if (!universityMap[uni]) {
        universityMap[uni] = {
          scores: [],
          ecs: [],
          bvs: [],
          students: new Set(),
          taskScores: {},
          monthlyScores: {},
        };
      }

      universityMap[uni].scores.push(a.score);
      universityMap[uni].ecs.push(a.ecCoverage);
      universityMap[uni].bvs.push(a.bvCoverage);
      universityMap[uni].students.add(a.userId);

      if (!universityMap[uni].taskScores[a.taskId]) {
        universityMap[uni].taskScores[a.taskId] = [];
      }
      universityMap[uni].taskScores[a.taskId].push(a.score);

      const month = a.createdAt.toISOString().slice(0, 7);
      if (!universityMap[uni].monthlyScores[month]) {
        universityMap[uni].monthlyScores[month] = [];
      }
      universityMap[uni].monthlyScores[month].push(a.score);
    });

    const taskMap = new Map<string, { name: string }>();

    const universityComparison = Object.entries(universityMap)
      .map(([name, data]) => {
        // Top tasks
        const topTasks = Object.entries(data.taskScores)
          .map(([taskId, scores]) => ({
            taskId,
            taskName: taskMap.get(taskId)?.name || `Задание ${taskId}`,
            avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
            attemptsCount: scores.length,
          }))
          .sort((a, b) => b.attemptsCount - a.attemptsCount)
          .slice(0, 5);

        // Trend calculation (last 3 months vs previous 3 months)
        const months = Object.keys(data.monthlyScores).sort();
        let trend: "improving" | "stable" | "declining" = "stable";
        if (months.length >= 6) {
          const last3 = months.slice(-3);
          const prev3 = months.slice(-6, -3);
          const last3Avg = last3.reduce(
            (s, m) => s + data.monthlyScores[m].reduce((ss, v) => ss + v, 0) / data.monthlyScores[m].length,
            0
          ) / 3;
          const prev3Avg = prev3.reduce(
            (s, m) => s + data.monthlyScores[m].reduce((ss, v) => ss + v, 0) / data.monthlyScores[m].length,
            0
          ) / 3;
          trend = last3Avg - prev3Avg > 5 ? "improving" : last3Avg - prev3Avg < -5 ? "declining" : "stable";
        }

        return {
          university: name,
          studentCount: data.students.size,
          avgScore: data.scores.length > 0
            ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length)
            : 0,
          avgEc: data.ecs.length > 0
            ? Math.round(data.ecs.reduce((s, v) => s + v, 0) / data.ecs.length)
            : 0,
          avgBv: data.bvs.length > 0
            ? Math.round(data.bvs.reduce((s, v) => s + v, 0) / data.bvs.length)
            : 0,
          totalAttempts: data.scores.length,
          topTasks,
          trend,
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore);

    const result = { universities: universityComparison };
    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("university-comparison analytics failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
