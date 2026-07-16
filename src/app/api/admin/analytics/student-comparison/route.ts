import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { computeTrend } from "@/lib/trend";

export async function GET(req: NextRequest) {
  return withErrorHandler(req, async () => {
    unwrapGuard(await requireAdmin());

    const { searchParams } = new URL(req.url);
    const studentIds = searchParams.get("studentIds");

    if (!studentIds) {
      return NextResponse.json({ error: "studentIds parameter required (comma-separated)" }, { status: 400 });
    }

    const ids = studentIds.split(",");
    if (ids.length < 2 || ids.length > 5) {
      return NextResponse.json({ error: "Provide 2-5 student IDs" }, { status: 400 });
    }

    // Check cache
    const cacheKey = makeCacheKey("student-comparison", { studentIds });
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const students = await db.user.findMany({
      where: { id: { in: ids }, role: "STUDENT", deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        group: true,
        university: true,
        createdAt: true,
        attempts: {
          select: {
            id: true,
            taskId: true,
            score: true,
            ecCoverage: true,
            bvCoverage: true,
            correctness: true,
            timeSpent: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const comparison = students.map((s) => {
      const attempts = s.attempts;
      const scores = attempts.map((a) => a.score);
      const avgScore = attempts.length > 0 ? Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length) : 0;
      const bestScore = attempts.length > 0 ? Math.max(...scores) : 0;
      const avgEc = attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.ecCoverage, 0) / attempts.length) : 0;
      const avgBv = attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.bvCoverage, 0) / attempts.length) : 0;
      const avgCorrectness = attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.correctness, 0) / attempts.length) : 0;
      const avgTime = attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.timeSpent, 0) / attempts.length) : 0;

      // Trend
      const trend = computeTrend(attempts);

      // Score trajectory
      const trajectory = attempts.map((a, i) => ({
        attempt: i + 1,
        score: a.score,
        date: a.createdAt.toISOString().split("T")[0],
      }));

      // Task breakdown
      const byTask: Record<string, { scores: number[] }> = {};
      for (const a of attempts) {
        if (!byTask[a.taskId]) byTask[a.taskId] = { scores: [] };
        byTask[a.taskId].scores.push(a.score);
      }
      const taskBreakdown = Object.entries(byTask).map(([tid, data]) => ({
        taskId: tid,
        bestScore: Math.max(...data.scores),
        avgScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
        attempts: data.scores.length,
      }));

      return {
        student: {
          id: s.id,
          name: s.name || s.email || "Unknown",
          group: s.group || "",
          university: s.university || "",
          registeredAt: s.createdAt.toISOString().split("T")[0],
        },
        metrics: {
          avgScore,
          bestScore,
          avgEc,
          avgBv,
          avgCorrectness,
          avgTime,
          totalAttempts: attempts.length,
          trend,
        },
        trajectory,
        taskBreakdown,
      };
    });

    const result = { students: comparison, count: comparison.length };
    setCache(cacheKey, result, DEFAULT_TTL.medium);
    return NextResponse.json(result);
  });
}
