import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

/**
 * Time-based activity analysis.
 * - Heatmap: day of week × hour of day
 * - Peak activity periods
 * - Activity by time of day (morning/afternoon/evening/night)
 * - Activity trends by week
 */
export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    unwrapGuard(await requireAdmin());

    const cacheKey = makeCacheKey("activity-time");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const allAttempts = await db.attempt.findMany({
      select: {
        createdAt: true,
        score: true,
        timeSpent: true,
        taskId: true,
        userId: true,
      },
      orderBy: { createdAt: "asc" },
      take: 50_000,
    });

    // Day-of-week × hour heatmap
    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    // Day-of-week × hour heatmap for avg scores
    const scoreHeatmap: { total: number[][]; count: number[][] } = {
      total: Array.from({ length: 7 }, () => Array(24).fill(0)),
      count: Array.from({ length: 7 }, () => Array(24).fill(0)),
    };

    // Time of day segments
    const timeSegments = {
      night: { label: "Ночь (0-6)", count: 0, totalScore: 0, totalTime: 0 },
      morning: { label: "Утро (6-12)", count: 0, totalScore: 0, totalTime: 0 },
      afternoon: { label: "День (12-18)", count: 0, totalScore: 0, totalTime: 0 },
      evening: { label: "Вечер (18-24)", count: 0, totalScore: 0, totalTime: 0 },
    };

    // Day of week distribution
    const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    const dayDistribution = Array.from({ length: 7 }, (_, i) => ({ day: dayNames[i], dayIndex: i, count: 0, totalScore: 0 }));

    // Weekly trends
    const weeklyTrend: Record<string, { count: number; totalScore: number }> = {};

    for (const a of allAttempts) {
      const date = new Date(a.createdAt);
      const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon...
      const hour = date.getHours();

      // Heatmap
      heatmap[dayOfWeek][hour]++;
      scoreHeatmap.total[dayOfWeek][hour] += a.score;
      scoreHeatmap.count[dayOfWeek][hour]++;

      // Time segment
      let segment: keyof typeof timeSegments;
      if (hour >= 0 && hour < 6) segment = "night";
      else if (hour >= 6 && hour < 12) segment = "morning";
      else if (hour >= 12 && hour < 18) segment = "afternoon";
      else segment = "evening";

      timeSegments[segment].count++;
      timeSegments[segment].totalScore += a.score;
      timeSegments[segment].totalTime += a.timeSpent;

      // Day distribution
      dayDistribution[dayOfWeek].count++;
      dayDistribution[dayOfWeek].totalScore += a.score;

      // Weekly trend
      const weekKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!weeklyTrend[weekKey]) weeklyTrend[weekKey] = { count: 0, totalScore: 0 };
      weeklyTrend[weekKey].count++;
      weeklyTrend[weekKey].totalScore += a.score;
    }

    // Build heatmap data for chart (flatten to array of objects)
    const heatmapData = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const count = heatmap[day][hour];
        const avgScore = scoreHeatmap.count[day][hour] > 0
          ? Math.round(scoreHeatmap.total[day][hour] / scoreHeatmap.count[day][hour])
          : 0;
        if (count > 0) {
          heatmapData.push({
            day: dayNames[day],
            dayIndex: day,
            hour,
            hourLabel: `${hour}:00`,
            count,
            avgScore,
          });
        }
      }
    }

    // Peak hours (top 5)
    const hourTotals = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      hourLabel: `${h}:00`,
      count: heatmap.reduce((sum, row) => sum + row[h], 0),
    }));
    const peakHours = hourTotals.sort((a, b) => b.count - a.count).slice(0, 5);

    // Peak days
    const peakDays = [...dayDistribution].sort((a, b) => b.count - a.count);

    // Time segment analysis
    const segmentAnalysis = Object.entries(timeSegments).map(([key, data]) => ({
      key,
      label: data.label,
      count: data.count,
      pct: allAttempts.length > 0 ? Math.round((data.count / allAttempts.length) * 100) : 0,
      avgScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
      avgTimeSeconds: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
    }));

    // Weekly trend chart data
    const trendChartData = Object.entries(weeklyTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30) // last 30 days
      .map(([date, data]) => ({
        date,
        attempts: data.count,
        avgScore: Math.round(data.totalScore / data.count),
      }));

    const result = {
      heatmapData,
      peakHours,
      peakDays,
      segmentAnalysis,
      trendChartData,
      summary: {
        totalAttempts: allAttempts.length,
        peakHour: peakHours[0]?.hourLabel || "—",
        peakDay: peakDays[0]?.day || "—",
        mostActiveSegment: segmentAnalysis.sort((a, b) => b.count - a.count)[0]?.label || "—",
      },
    };

    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
