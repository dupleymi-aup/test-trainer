import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { MS_PER_DAY } from "@/lib/time-constants";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

/**
 * Student return analysis.
 * Identifies students who returned after a gap (>14 days) and analyzes:
 * - How long the gap was
 * - Performance before vs after return
 * - How many returned students are now active
 * - Whether they catch up or fall further behind
 */
export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    unwrapGuard(await requireAdmin());

    const cacheKey = makeCacheKey("student-return");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const totalTaskCount = tasks.length;
    const GAP_THRESHOLD_DAYS = 14;

    const students = await db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      select: {
        id: true, name: true, email: true, group: true, university: true, createdAt: true,
        attempts: { select: { taskId: true, score: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      },
    });

    const returnedStudents: Array<{
      id: string; name: string; group: string; university: string;
      gapDays: number; returnDate: string;
      beforeScore: number; afterScore: number; scoreChange: number;
      beforeTasks: number; afterTasks: number;
      trend: "improving" | "declining" | "stable";
      currentlyActive: boolean; daysSinceReturn: number;
      catchUpRate: number; totalGaps: number;
    }> = [];

    const now = new Date();

    for (const student of students) {
      const attempts = student.attempts;
      if (attempts.length < 3) continue;

      const gaps: Array<{ beforeIdx: number; afterIdx: number; gapDays: number }> = [];

      for (let i = 1; i < attempts.length; i++) {
        const prevDate = new Date(attempts[i - 1].createdAt);
        const currDate = new Date(attempts[i].createdAt);
        const gapMs = currDate.getTime() - prevDate.getTime();
        const gapDays = Math.round(gapMs / MS_PER_DAY);

        if (gapDays >= GAP_THRESHOLD_DAYS) {
          gaps.push({ beforeIdx: i - 1, afterIdx: i, gapDays });
        }
      }

      if (gaps.length === 0) continue;

      // Analyze each gap
      for (const gap of gaps) {
        const beforeAttempts = attempts.slice(0, gap.afterIdx);
        const afterAttempts = attempts.slice(gap.afterIdx);

        const beforeAvgScore = beforeAttempts.length > 0
          ? Math.round(beforeAttempts.reduce((s, a) => s + a.score, 0) / beforeAttempts.length)
          : 0;
        const afterAvgScore = afterAttempts.length > 0
          ? Math.round(afterAttempts.reduce((s, a) => s + a.score, 0) / afterAttempts.length)
          : 0;

        const beforeUniqueTasks = new Set(beforeAttempts.map((a) => a.taskId)).size;
        const afterUniqueTasks = new Set(afterAttempts.map((a) => a.taskId)).size;

        const returnDate = new Date(attempts[gap.afterIdx].createdAt);
        const daysSinceReturn = Math.round((now.getTime() - returnDate.getTime()) / MS_PER_DAY);
        const currentlyActive = daysSinceReturn <= 14;

        // Score change
        const scoreChange = afterAvgScore - beforeAvgScore;

        // Trend after return
        const afterFirst3 = afterAttempts.slice(0, 3).map((a) => a.score);
        const afterLast3 = afterAttempts.slice(-3).map((a) => a.score);
        const afterFirstAvg = afterFirst3.reduce((s, v) => s + v, 0) / afterFirst3.length;
        const afterLastAvg = afterLast3.reduce((s, v) => s + v, 0) / afterLast3.length;
        const trend = afterAttempts.length >= 6
          ? (afterLastAvg - afterFirstAvg > 15 ? "improving" : afterLastAvg - afterFirstAvg < -15 ? "declining" : "stable")
          : "stable";

        // Catch-up rate: % of remaining tasks completed after return
        const tasksBeforeReturn = beforeUniqueTasks;
        const remainingBefore = totalTaskCount - tasksBeforeReturn;
        const completedAfter = afterUniqueTasks;
        const catchUpRate = remainingBefore > 0 ? Math.round((completedAfter / remainingBefore) * 100) : 100;

        returnedStudents.push({
          id: student.id,
          name: student.name || student.email || "Unknown",
          group: student.group || "—",
          university: student.university || "—",
          gapDays: gap.gapDays,
          returnDate: returnDate.toISOString(),
          beforeScore: beforeAvgScore,
          afterScore: afterAvgScore,
          scoreChange,
          beforeTasks: beforeUniqueTasks,
          afterTasks: afterUniqueTasks,
          trend,
          currentlyActive,
          daysSinceReturn,
          catchUpRate: Math.min(catchUpRate, 100),
          totalGaps: gaps.length,
        });
      }
    }

    // Summary
    const totalReturned = returnedStudents.length;
    const currentlyActiveCount = returnedStudents.filter((r) => r.currentlyActive).length;
    const improvingCount = returnedStudents.filter((r) => r.trend === "improving").length;
    const decliningCount = returnedStudents.filter((r) => r.trend === "declining").length;
    const avgGapDays = totalReturned > 0 ? Math.round(returnedStudents.reduce((s, r) => s + r.gapDays, 0) / totalReturned) : 0;
    const avgCatchUpRate = totalReturned > 0 ? Math.round(returnedStudents.reduce((s, r) => s + r.catchUpRate, 0) / totalReturned) : 0;

    // Sort by most recent return
    returnedStudents.sort((a, b) => new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime());

    const result = {
      returnedStudents: returnedStudents.slice(0, 100),
      summary: {
        totalReturned,
        currentlyActive: currentlyActiveCount,
        currentlyActivePct: totalReturned > 0 ? Math.round((currentlyActiveCount / totalReturned) * 100) : 0,
        improving: improvingCount,
        declining: decliningCount,
        avgGapDays,
        avgCatchUpRate,
        avgScoreChange: totalReturned > 0 ? Math.round(returnedStudents.reduce((s, r) => s + r.scoreChange, 0) / totalReturned) : 0,
      },
    };

    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
