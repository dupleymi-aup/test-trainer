import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

/**
 * Cohort analysis: group students by registration month and track their progress.
 * For each cohort, compute:
 * - Student count, attempts count
 * - Avg score, completion rate
 * - Active students (attempt in last 30 days)
 * - Drop-off rate (no attempts after first week)
 * - Week-by-week retention curve
 */
export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    unwrapGuard(await requireAdmin());

    const cacheKey = makeCacheKey("cohort-analysis");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const totalTaskCount = tasks.length;

    const students = await db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      select: {
        id: true,
        name: true,
        group: true,
        university: true,
        createdAt: true,
        attempts: {
          select: { taskId: true, score: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
      take: 10000,
    });

    // Group by cohort (registration month)
    const cohorts: Record<string, typeof students> = {};
    for (const s of students) {
      const cohortKey = s.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!cohorts[cohortKey]) cohorts[cohortKey] = [];
      cohorts[cohortKey].push(s);
    }

    const now = new Date();
    const PASS_THRESHOLD = 60;

    const cohortAnalysis = Object.entries(cohorts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cohortKey, cohortStudents]) => {
        const cohortDate = new Date(cohortKey + "-01");
        const daysSinceCohort = Math.round((now.getTime() - cohortDate.getTime()) / (1000 * 60 * 60 * 24));
        const weeksSinceCohort = Math.round(daysSinceCohort / 7);

        let totalAttempts = 0;
        let totalScore = 0;
        let activeCount = 0;
        let droppedOff = 0;
        let completedCount = 0;

        // Weekly retention: for each week, how many students had at least 1 attempt
        const weeklyRetention: number[] = [];
        const maxWeeks = Math.min(weeksSinceCohort, 24); // cap at 24 weeks

        for (let week = 0; week <= maxWeeks; week++) {
          const weekStart = new Date(cohortDate);
          weekStart.setDate(weekStart.getDate() + week * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          const activeThisWeek = cohortStudents.filter((s) =>
            s.attempts.some((a) => {
              const d = new Date(a.createdAt);
              return d >= weekStart && d < weekEnd;
            })
          ).length;

          weeklyRetention.push(activeThisWeek);
        }

        for (const s of cohortStudents) {
          const attempts = s.attempts;
          totalAttempts += attempts.length;

          if (attempts.length > 0) {
            totalScore += attempts.reduce((sum, a) => sum + a.score, 0);

            // Active in last 30 days
            const lastAttempt = new Date(attempts[attempts.length - 1].createdAt);
            const daysSinceLast = Math.round((now.getTime() - lastAttempt.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceLast <= 30) activeCount++;

            // Dropped off: no attempts after first 7 days
            const firstAttempt = new Date(attempts[0].createdAt);
            const daysFromRegToFirst = Math.round((firstAttempt.getTime() - cohortDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysFromRegToFirst > 7) droppedOff++;
          } else {
            droppedOff++;
          }

          // Completion: passed >= 50% of tasks
          const taskScores: Record<string, number[]> = {};
          for (const a of attempts) {
            if (!taskScores[a.taskId]) taskScores[a.taskId] = [];
            taskScores[a.taskId].push(a.score);
          }
          const completedTasks = Object.values(taskScores).filter((scores) =>
            Math.max(...scores) >= PASS_THRESHOLD
          ).length;
          if (completedTasks >= totalTaskCount * 0.5) completedCount++;
        }

        const avgScore = totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;
        const activeRate = cohortStudents.length > 0 ? Math.round((activeCount / cohortStudents.length) * 100) : 0;
        const dropOffRate = cohortStudents.length > 0 ? Math.round((droppedOff / cohortStudents.length) * 100) : 0;
        const completionRate = cohortStudents.length > 0 ? Math.round((completedCount / cohortStudents.length) * 100) : 0;

        return {
          cohort: cohortKey,
          cohortLabel: new Date(cohortDate).toLocaleDateString("ru-RU", { month: "short", year: "numeric" }),
          studentCount: cohortStudents.length,
          totalAttempts,
          avgAttemptsPerStudent: cohortStudents.length > 0 ? Math.round(totalAttempts / cohortStudents.length * 10) / 10 : 0,
          avgScore,
          activeRate,
          dropOffRate,
          completionRate,
          weeksSinceCohort: weeksSinceCohort,
          weeklyRetention,
        };
      });

    const summary = {
      totalCohorts: cohortAnalysis.length,
      avgActiveRate: cohortAnalysis.length > 0
        ? Math.round(cohortAnalysis.reduce((s, c) => s + c.activeRate, 0) / cohortAnalysis.length)
        : 0,
      avgDropOffRate: cohortAnalysis.length > 0
        ? Math.round(cohortAnalysis.reduce((s, c) => s + c.dropOffRate, 0) / cohortAnalysis.length)
        : 0,
      avgCompletionRate: cohortAnalysis.length > 0
        ? Math.round(cohortAnalysis.reduce((s, c) => s + c.completionRate, 0) / cohortAnalysis.length)
        : 0,
    };

    const result = { cohorts: cohortAnalysis, summary };

    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
