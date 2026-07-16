import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { parseSearchParams, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { z } from "zod";

const comparePeriodsParamsSchema = z.object({
  period1Start: z.string().optional(),
  period1End: z.string().optional(),
  period2Start: z.string().optional(),
  period2End: z.string().optional(),
  groupId: z.string().optional(),
  university: z.string().optional(),
});

function calculateMetrics(attempts: { userId: string; taskId: string; score: number; ecCoverage: number; bvCoverage: number; correctness: number; timeSpent: number }[]) {
  const totalAttempts = attempts.length;
  const uniqueStudents = new Set(attempts.map((a) => a.userId)).size;
  const avgScore = totalAttempts > 0 ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / totalAttempts) : 0;
  const avgEc = totalAttempts > 0 ? Math.round(attempts.reduce((s, a) => s + a.ecCoverage, 0) / totalAttempts) : 0;
  const avgBv = totalAttempts > 0 ? Math.round(attempts.reduce((s, a) => s + a.bvCoverage, 0) / totalAttempts) : 0;
  const avgCorrectness = totalAttempts > 0 ? Math.round(attempts.reduce((s, a) => s + a.correctness, 0) / totalAttempts) : 0;
  const avgTime = totalAttempts > 0 ? Math.round(attempts.reduce((s, a) => s + a.timeSpent, 0) / totalAttempts) : 0;

  const taskScores: Record<string, number[]> = {};
  attempts.forEach((a) => {
    if (!taskScores[a.taskId]) taskScores[a.taskId] = [];
    taskScores[a.taskId].push(a.score);
  });

  const taskPerformance = Object.entries(taskScores).map(([taskId, scores]) => ({
    taskId,
    avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
    attemptsCount: scores.length,
  }));

  const taskMap = new Map(tasks.map((t) => [String(t.id), t.topics]));
  const topicScores: Record<string, number[]> = {};
  attempts.forEach((a) => {
    const topics = taskMap.get(a.taskId);
    if (topics) {
      topics.forEach((topic) => {
        if (!topicScores[topic]) topicScores[topic] = [];
        topicScores[topic].push(a.score);
      });
    }
  });

  const topicPerformance = Object.entries(topicScores).map(([topic, scores]) => ({
    topic,
    avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
  }));

  return { totalAttempts, uniqueStudents, avgScore, avgEc, avgBv, avgCorrectness, avgTime, taskPerformance, topicPerformance };
}

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    unwrapGuard(await requireAdmin());

    const params = parseSearchParams(req, comparePeriodsParamsSchema);
    if (!params.success) return params.errorResponse;
    const { period1Start, period1End, period2Start, period2End, groupId, university } = params.data;

    if (!period1Start || !period1End) {
      const now = new Date();
      const period2EndDefault = new Date(now);
      period2EndDefault.setDate(period2EndDefault.getDate() - 30);
      const period2StartDefault = new Date(period2EndDefault);
      period2StartDefault.setDate(period2StartDefault.getDate() - 30);
      const period1EndDefault = new Date(period2StartDefault);
      period1EndDefault.setDate(period1EndDefault.getDate() - 1);
      const period1StartDefault = new Date(period1EndDefault);
      period1StartDefault.setDate(period1StartDefault.getDate() - 30);

      return NextResponse.json({
        period1: { start: period1StartDefault.toISOString().split("T")[0], end: period1EndDefault.toISOString().split("T")[0] },
        period2: { start: period2StartDefault.toISOString().split("T")[0], end: period2EndDefault.toISOString().split("T")[0] },
        comparison: null,
        message: "No periods specified, using defaults",
      });
    }

    if (!period2Start || !period2End) {
      return NextResponse.json({ error: "Both period2Start and period2End are required" }, { status: 400 });
    }

    // Check cache
    const cacheKey = makeCacheKey("compare-periods", { period1Start, period1End, period2Start, period2End, groupId, university });
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    let userIds: string[] | undefined;
    if (groupId) {
      const usersInGroup = await db.userGroup.findMany({ where: { groupId }, select: { userId: true } });
      userIds = usersInGroup.map((u) => u.userId);
    }

    if (university) {
      const usersAtUni = await db.user.findMany({ where: { role: "STUDENT", university, isActive: true, deletedAt: null }, select: { id: true } });
      const uniIds = usersAtUni.map((u) => u.id);
      userIds = userIds ? userIds.filter((id) => uniIds.includes(id)) : uniIds;
    }

    const [attempts1, attempts2] = await Promise.all([
      db.attempt.findMany({ where: { userId: userIds ? { in: userIds } : undefined, createdAt: { gte: new Date(period1Start), lte: new Date(period1End + "T23:59:59") } }, select: { userId: true, taskId: true, score: true, ecCoverage: true, bvCoverage: true, correctness: true, timeSpent: true } }),
      db.attempt.findMany({ where: { userId: userIds ? { in: userIds } : undefined, createdAt: { gte: new Date(period2Start), lte: new Date(period2End + "T23:59:59") } }, select: { userId: true, taskId: true, score: true, ecCoverage: true, bvCoverage: true, correctness: true, timeSpent: true } }),
    ]);

    const period1MetricsBase = calculateMetrics(attempts1);
    const period2MetricsBase = calculateMetrics(attempts2);

    // University breakdown (only if no university filter)
    const universityBreakdown1: Record<string, { attempts: number; avgScore: number }> = {};
    const universityBreakdown2: Record<string, { attempts: number; avgScore: number }> = {};

    if (!university) {
      const allStudentIds = [...new Set([...attempts1.map((a) => a.userId), ...attempts2.map((a) => a.userId)])];
      const users = await db.user.findMany({ where: { id: { in: allStudentIds } }, select: { id: true, university: true } });
      const userUniMap = new Map(users.map((u) => [u.id, u.university || "Не указан"]));

      const uniAttempts1: Record<string, number[]> = {};
      attempts1.forEach((a) => { const uni = userUniMap.get(a.userId) || "Не указан"; if (!uniAttempts1[uni]) uniAttempts1[uni] = []; uniAttempts1[uni].push(a.score); });
      for (const [uni, scores] of Object.entries(uniAttempts1)) universityBreakdown1[uni] = { attempts: scores.length, avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) };

      const uniAttempts2: Record<string, number[]> = {};
      attempts2.forEach((a) => { const uni = userUniMap.get(a.userId) || "Не указан"; if (!uniAttempts2[uni]) uniAttempts2[uni] = []; uniAttempts2[uni].push(a.score); });
      for (const [uni, scores] of Object.entries(uniAttempts2)) universityBreakdown2[uni] = { attempts: scores.length, avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) };
    }

    const period1Metrics = { ...period1MetricsBase, universityBreakdown: universityBreakdown1 };
    const period2Metrics = { ...period2MetricsBase, universityBreakdown: universityBreakdown2 };

    const calculateChange = (val1: number, val2: number) => { if (val1 === 0) return val2 > 0 ? 100 : 0; return Math.round(((val2 - val1) / val1) * 100); };

    const comparison = {
      attempts: { period1: period1Metrics.totalAttempts, period2: period2Metrics.totalAttempts, change: calculateChange(period1Metrics.totalAttempts, period2Metrics.totalAttempts) },
      students: { period1: period1Metrics.uniqueStudents, period2: period2Metrics.uniqueStudents, change: calculateChange(period1Metrics.uniqueStudents, period2Metrics.uniqueStudents) },
      avgScore: { period1: period1Metrics.avgScore, period2: period2Metrics.avgScore, change: period2Metrics.avgScore - period1Metrics.avgScore },
      avgEc: { period1: period1Metrics.avgEc, period2: period2Metrics.avgEc, change: period2Metrics.avgEc - period1Metrics.avgEc },
      avgBv: { period1: period1Metrics.avgBv, period2: period2Metrics.avgBv, change: period2Metrics.avgBv - period1Metrics.avgBv },
    };

    const result = { period1: { start: period1Start, end: period1End }, period2: { start: period2Start, end: period2End }, period1Metrics, period2Metrics, comparison };
    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
