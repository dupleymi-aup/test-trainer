import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { logger } from "@/lib/logger";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

/**
 * Course completion forecast.
 * Predicts which students will complete all tasks based on:
 * - Current velocity (tasks per week)
 * - Total tasks available
 * - Tasks already completed (score >= 60)
 * - Historical trend
 */
export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const cacheKey = makeCacheKey("completion-forecast");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const totalTaskCount = tasks.length;

    const students = await db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        group: true,
        university: true,
        createdAt: true,
        attempts: {
          select: { taskId: true, score: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const now = new Date();
    const PASS_THRESHOLD = 60;

    const forecasts = students.map((student) => {
      const attempts = student.attempts;
      if (attempts.length === 0) {
        return {
          id: student.id,
          name: student.name || student.email || "Unknown",
          group: student.group || "—",
          university: student.university || "—",
          completedTasks: 0,
          totalTasks: totalTaskCount,
          completionPct: 0,
          velocity: 0,
          weeksToComplete: null,
          onTrack: false,
          riskLevel: "high" as const,
          registeredDaysAgo: Math.round((now.getTime() - new Date(student.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          lastActivityDaysAgo: null,
          trend: "none" as const,
        };
      }

      // Unique tasks completed (passed)
      const taskScores: Record<string, number[]> = {};
      for (const a of attempts) {
        if (!taskScores[a.taskId]) taskScores[a.taskId] = [];
        taskScores[a.taskId].push(a.score);
      }

      const completedTasks = Object.values(taskScores).filter((scores) =>
        Math.max(...scores) >= PASS_THRESHOLD
      ).length;

      const completionPct = Math.round((completedTasks / totalTaskCount) * 100);

      // Calculate velocity: tasks per week
      const firstAttempt = new Date(attempts[0].createdAt);
      const lastAttempt = new Date(attempts[attempts.length - 1].createdAt);
      const daysActive = Math.max(1, Math.round((lastAttempt.getTime() - firstAttempt.getTime()) / (1000 * 60 * 60 * 24)));
      const weeksActive = daysActive / 7;

      // Count unique tasks attempted (not just passed)
      const uniqueTasksAttempted = Object.keys(taskScores).length;
      const velocity = weeksActive > 0 ? Math.round((uniqueTasksAttempted / weeksActive) * 10) / 10 : 0;

      // Weeks remaining to complete
      const remainingTasks = totalTaskCount - completedTasks;
      const weeksToComplete = velocity > 0 ? Math.round((remainingTasks / velocity) * 10) / 10 : null;

      // Trend: compare first half vs second half velocity
      const midPoint = Math.floor(attempts.length / 2);
      const firstHalf = attempts.slice(0, midPoint);
      const secondHalf = attempts.slice(midPoint);

      const firstHalfDays = firstHalf.length > 1
        ? Math.max(1, (new Date(firstHalf[firstHalf.length - 1].createdAt).getTime() - new Date(firstHalf[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 7;
      const secondHalfDays = secondHalf.length > 1
        ? Math.max(1, (new Date(secondHalf[secondHalf.length - 1].createdAt).getTime() - new Date(secondHalf[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 7;

      const firstHalfTasks = new Set(firstHalf.map((a) => a.taskId)).size;
      const secondHalfTasks = new Set(secondHalf.map((a) => a.taskId)).size;

      const firstHalfVelocity = firstHalfTasks / (firstHalfDays / 7);
      const secondHalfVelocity = secondHalfTasks / (secondHalfDays / 7);

      const trend = secondHalfVelocity > firstHalfVelocity * 1.2
        ? "improving"
        : secondHalfVelocity < firstHalfVelocity * 0.8
          ? "declining"
          : "stable";

      // Days since last activity
      const lastActivityDaysAgo = Math.round((now.getTime() - lastAttempt.getTime()) / (1000 * 60 * 60 * 24));

      // Risk level
      let riskLevel: "low" | "medium" | "high" | "critical";
      if (completionPct >= 80) riskLevel = "low";
      else if (completionPct >= 50) riskLevel = "medium";
      else if (completionPct >= 20) riskLevel = "high";
      else riskLevel = "critical";

      // Adjust risk based on activity
      if (lastActivityDaysAgo > 30) riskLevel = "critical";
      else if (lastActivityDaysAgo > 14 && riskLevel === "low") riskLevel = "medium";

      // On track: would complete within a reasonable timeframe (e.g., 12 weeks from now)
      const onTrack = weeksToComplete !== null && weeksToComplete <= 12 && trend !== "declining";

      return {
        id: student.id,
        name: student.name || student.email || "Unknown",
        group: student.group || "—",
        university: student.university || "—",
        completedTasks,
        totalTasks: totalTaskCount,
        completionPct,
        velocity,
        weeksToComplete,
        onTrack,
        riskLevel,
        registeredDaysAgo: Math.round((now.getTime() - new Date(student.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        lastActivityDaysAgo,
        trend,
      };
    });

    // Summary stats
    const onTrackCount = forecasts.filter((f) => f.onTrack).length;
    const atRiskCount = forecasts.filter((f) => f.riskLevel === "high" || f.riskLevel === "critical").length;
    const avgCompletion = forecasts.length > 0
      ? Math.round(forecasts.reduce((s, f) => s + f.completionPct, 0) / forecasts.length)
      : 0;
    const avgVelocity = forecasts.filter((f) => f.velocity > 0).length > 0
      ? Math.round(forecasts.filter((f) => f.velocity > 0).reduce((s, f) => s + f.velocity, 0) / forecasts.filter((f) => f.velocity > 0).length * 10) / 10
      : 0;

    // Distribution by completion percentage
    const completionDistribution = {
      "0%": forecasts.filter((f) => f.completionPct === 0).length,
      "1-25%": forecasts.filter((f) => f.completionPct > 0 && f.completionPct <= 25).length,
      "26-50%": forecasts.filter((f) => f.completionPct > 25 && f.completionPct <= 50).length,
      "51-75%": forecasts.filter((f) => f.completionPct > 50 && f.completionPct <= 75).length,
      "76-100%": forecasts.filter((f) => f.completionPct > 75).length,
    };

    // Sort: most at-risk first
    forecasts.sort((a, b) => {
      const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    });

    const result = {
      forecasts,
      summary: {
        totalStudents: forecasts.length,
        onTrack: onTrackCount,
        atRisk: atRiskCount,
        avgCompletion,
        avgVelocity,
        completionDistribution,
      },
    };

    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to fetch completion forecast analytics", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
