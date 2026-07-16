import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { computeStudentRisk, computeStudentStats } from "@/lib/risk-analysis";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { parseSearchParams, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { analyticsParamsSchema } from "@/lib/shared-schemas";

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    unwrapGuard(await requireAdmin());

    const params = parseSearchParams(request, analyticsParamsSchema);
    if (!params.success) return params.errorResponse;
    const { dateFrom, dateTo, groupId, university: universityFilter } = params.data;

    const cacheKey = makeCacheKey("predictions", { dateFrom: dateFrom || "", dateTo: dateTo || "", groupId: groupId || "", university: universityFilter || "" });
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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

    // Get all students with filters
    const students = await db.user.findMany({
      where: studentWhere,
      select: {
        id: true,
        name: true,
        email: true,
        group: true,
        university: true,
        createdAt: true,
        attempts: {
          where: (() => {
            const attemptWhere: Record<string, unknown> = {};
            if (dateFrom || dateTo) {
              const dateCond: Record<string, Date> = {};
              if (dateFrom) dateCond.gte = new Date(dateFrom);
              if (dateTo) dateCond.lte = new Date(dateTo);
              attemptWhere.createdAt = dateCond;
            }
            return Object.keys(attemptWhere).length > 0 ? attemptWhere : undefined;
          })(),
          select: {
            score: true,
            ecCoverage: true,
            bvCoverage: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const atRiskStudents: Array<{
      student: { id: string; name: string; email: string; group: string; university: string };
      riskFactors: string[];
      stats: {
        bestScore: number;
        avgScore: number;
        avgEc: number;
        avgBv: number;
        lastAttemptDate: string | null;
        attemptsCount: number;
        trend: "improving" | "stable" | "declining";
      };
      recommendations: string[];
      dropoutRisk: "high" | "medium" | "low";
    }> = [];

    for (const student of students) {
      const attempts = student.attempts;
      if (attempts.length === 0) continue;

      // Use shared risk analysis library
      const riskResult = computeStudentRisk(
        attempts.map((a) => ({ ...a, correctness: undefined, timeSpent: undefined })),
        student.createdAt
      );

      if (riskResult.riskFactors.length === 0) continue;

      const stats = computeStudentStats(
        attempts.map((a) => ({ ...a, correctness: undefined, timeSpent: undefined }))
      );

      atRiskStudents.push({
        student: {
          id: student.id,
          name: student.name || student.email || "Unknown",
          email: student.email || "",
          group: student.group || "",
          university: student.university || "",
        },
        riskFactors: riskResult.riskFactors,
        stats: {
          bestScore: stats.bestScore,
          avgScore: stats.avgScore,
          avgEc: stats.avgEc,
          avgBv: stats.avgBv,
          lastAttemptDate: attempts[attempts.length - 1]?.createdAt.toISOString() || null,
          attemptsCount: stats.totalAttempts,
          trend: riskResult.trend,
        },
        recommendations: riskResult.recommendations,
        dropoutRisk: riskResult.dropoutRisk,
      });
    }

    // Sort by risk factors count (most at-risk first)
    atRiskStudents.sort((a, b) => b.riskFactors.length - a.riskFactors.length);

    // System-level insights
    const allAttempts = await db.attempt.findMany({
      select: { taskId: true, score: true },
      take: 10_000,
      orderBy: { createdAt: "desc" },
    });

    const taskMap = new Map(
      tasks.map((t) => [String(t.id), { name: t.name, topics: t.topics }])
    );

    const taskScores: Record<string, number[]> = {};
    allAttempts.forEach((a) => {
      if (!taskScores[a.taskId]) taskScores[a.taskId] = [];
      taskScores[a.taskId].push(a.score);
    });

    const tasksByFailRate = Object.entries(taskScores)
      .map(([taskId, scores]) => ({
        taskId,
        taskName: taskMap.get(taskId)?.name || `Задание ${taskId}`,
        failRate: Math.round((scores.filter((s) => s < 50).length / scores.length) * 100),
        avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
        topics: taskMap.get(taskId)?.topics || [],
      }))
      .sort((a, b) => b.failRate - a.failRate)
      .slice(0, 5);

    const topicsNeedingAttention: Record<string, { scores: number[] }> = {};
    allAttempts.forEach((a) => {
      const meta = taskMap.get(a.taskId);
      if (!meta) return;
      meta.topics.forEach((topic) => {
        if (!topicsNeedingAttention[topic]) topicsNeedingAttention[topic] = { scores: [] };
        topicsNeedingAttention[topic].scores.push(a.score);
      });
    });

    const weakTopics = Object.entries(topicsNeedingAttention)
      .map(([topic, data]) => ({
        topic,
        avgScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
      }))
      .filter((t) => t.avgScore < 60)
      .sort((a, b) => a.avgScore - b.avgScore);

    // Group-level recommendations
    const groups = await db.group.findMany({
      select: {
        id: true,
        name: true,
        members: {
          select: {
            user: {
              select: {
                id: true,
                attempts: { select: { score: true } },
              },
            },
          },
        },
      },
    });

    const groupRecommendations = groups
      .map((g) => {
        const allScores = g.members.flatMap((m) => m.user.attempts.map((a) => a.score));
        const avgScore = allScores.length > 0
          ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length)
          : 0;
        const atRiskCount = g.members.filter((m) =>
          m.user.attempts.length > 0 &&
          m.user.attempts.reduce((max, a) => Math.max(max, a.score), 0) < 50
        ).length;

        return {
          groupId: g.id,
          groupName: g.name,
          avgScore,
          atRiskStudents: atRiskCount,
          recommendation:
            avgScore < 50
              ? "Группе требуется дополнительное внимание и пересмотр учебного плана"
              : atRiskCount > g.members.length * 0.3
                ? "Значительная часть студентов группы нуждается в поддержке"
                : null,
        };
      })
      .filter((g) => g.recommendation !== null);

    const result = {
      atRiskStudents,
      totalAtRisk: atRiskStudents.length,
      systemInsights: {
        tasksByFailRate,
        weakTopics,
        groupRecommendations,
      },
    };

    setCache(cacheKey, result, DEFAULT_TTL.medium);
    return NextResponse.json(result);
  });
}
