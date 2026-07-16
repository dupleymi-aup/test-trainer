import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const _HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    unwrapGuard(await requireAdmin());

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const universityFilter = searchParams.get("university");

    // Check cache
    const cacheKey = makeCacheKey("time-activity", { groupId, universityFilter });
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Build student filter
    const studentWhere: Record<string, unknown> = { role: "STUDENT", deletedAt: null };

    if (groupId) {
      const memberIds = await db.userGroup.findMany({
        where: { groupId },
        select: { userId: true },
      });
      studentWhere.id = { in: memberIds.map((m) => m.userId) };
    }
    if (universityFilter) studentWhere.university = universityFilter;

    const students = await db.user.findMany({
      where: studentWhere,
      select: { id: true },
    });

    const studentIds = students.map((s) => s.id);

    // Fetch all attempts for these students
    const attempts = await db.attempt.findMany({
      where: { userId: { in: studentIds } },
      select: {
        score: true,
        timeSpent: true,
        createdAt: true,
        userId: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Hour × Day heatmap: hour (0-23) × day (0=Mon..6=Sun)
    const heatmap: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));
    const scoreSum: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));
    const timeSum: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));

    // Hourly distribution (total attempts per hour)
    const hourlyDistribution = Array.from({ length: 24 }, () => ({
      hour: 0,
      attempts: 0,
      avgScore: 0,
      avgTime: 0,
    }));

    // Daily distribution (total attempts per day of week)
    const dailyDistribution = Array.from({ length: 7 }, () => ({
      day: 0,
      name: "",
      attempts: 0,
      avgScore: 0,
      avgTime: 0,
      uniqueStudents: new Set<string>(),
    }));

    // Peak hours tracking
    const peakHours: { hour: number; attempts: number; avgScore: number }[] = [];

    for (const a of attempts) {
      const date = new Date(a.createdAt);
      // getDay(): 0=Sun, 1=Mon... convert to 0=Mon..6=Sun
      let dayOfWeek = date.getDay() - 1;
      if (dayOfWeek < 0) dayOfWeek = 6;
      const hour = date.getHours();

      heatmap[hour][dayOfWeek]++;
      scoreSum[hour][dayOfWeek] += a.score;
      timeSum[hour][dayOfWeek] += a.timeSpent;

      hourlyDistribution[hour].attempts++;
      hourlyDistribution[hour].avgScore += a.score;
      hourlyDistribution[hour].avgTime += a.timeSpent;

      dailyDistribution[dayOfWeek].attempts++;
      dailyDistribution[dayOfWeek].avgScore += a.score;
      dailyDistribution[dayOfWeek].avgTime += a.timeSpent;
      dailyDistribution[dayOfWeek].uniqueStudents.add(a.userId);
    }

    // Calculate averages
    for (let h = 0; h < 24; h++) {
      const hd = hourlyDistribution[h];
      hd.hour = h;
      if (hd.attempts > 0) {
        hd.avgScore = Math.round(hd.avgScore / hd.attempts);
        hd.avgTime = Math.round(hd.avgTime / hd.attempts);
      }
    }

    for (let d = 0; d < 7; d++) {
      const dd = dailyDistribution[d];
      dd.name = DAY_NAMES[d];
      dd.day = d;
      if (dd.attempts > 0) {
        dd.avgScore = Math.round(dd.avgScore / dd.attempts);
        dd.avgTime = Math.round(dd.avgTime / dd.attempts);
      }
    }

    // Convert uniqueStudents Set to count for JSON serialization
    const dailyDistributionSerialized = dailyDistribution.map((dd) => ({
      day: dd.day,
      name: dd.name,
      attempts: dd.attempts,
      avgScore: dd.avgScore,
      avgTime: dd.avgTime,
      uniqueStudents: dd.uniqueStudents.size,
    }));

    // Find peak hours (top 5)
    for (let h = 0; h < 24; h++) {
      if (hourlyDistribution[h].attempts > 0) {
        peakHours.push({
          hour: h,
          attempts: hourlyDistribution[h].attempts,
          avgScore: hourlyDistribution[h].avgScore,
        });
      }
    }
    peakHours.sort((a, b) => b.attempts - a.attempts);
    const topPeakHours = peakHours.slice(0, 5).map((p) => ({
      ...p,
      label: `${p.hour}:00-${p.hour + 1}:00`,
    }));

    // Find least active hours
    const lowActivityHours = peakHours
      .sort((a, b) => a.attempts - b.attempts)
      .slice(0, 3)
      .map((p) => ({ ...p, label: `${p.hour}:00-${p.hour + 1}:00` }));

    // Build heatmap cells for UI
    const heatmapCells: Array<{
      hour: number;
      day: number;
      count: number;
      avgScore: number;
      avgTime: number;
    }> = [];

    for (let h = 0; h < 24; h++) {
      for (let d = 0; d < 7; d++) {
        const count = heatmap[h][d];
        heatmapCells.push({
          hour: h,
          day: d,
          count,
          avgScore: count > 0 ? Math.round(scoreSum[h][d] / count) : 0,
          avgTime: count > 0 ? Math.round(timeSum[h][d] / count) : 0,
        });
      }
    }

    // Summary stats
    const totalAttempts = attempts.length;
    const totalStudents = new Set(attempts.map((a) => a.userId)).size;
    const avgTimePerAttempt =
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.timeSpent, 0) / attempts.length)
        : 0;
    const avgScoreOverall =
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
        : 0;

    // Most active day
    const mostActiveDay = dailyDistribution.reduce((best, d) =>
      d.attempts > best.attempts ? d : best
    , dailyDistribution[0]);

    // Most active hour
    const mostActiveHour = hourlyDistribution.reduce((best, h) =>
      h.attempts > best.attempts ? h : best
    , hourlyDistribution[0]);

    // Best scoring hour (min 5 attempts)
    const bestScoringHour = hourlyDistribution
      .filter((h) => h.attempts >= 5)
      .reduce(
        (best, h) => (h.avgScore > best.avgScore ? h : best),
        hourlyDistribution.find((h) => h.attempts >= 5) || hourlyDistribution[0]
      );

    // Activity by time period (morning/afternoon/evening/night)
    const periods = [
      { name: "Ночь (0-6)", start: 0, end: 6 },
      { name: "Утро (6-12)", start: 6, end: 12 },
      { name: "День (12-18)", start: 12, end: 18 },
      { name: "Вечер (18-24)", start: 18, end: 24 },
    ];

    const periodStats = periods.map((p) => {
      const periodAttempts = attempts.filter((a) => {
        const h = new Date(a.createdAt).getHours();
        return h >= p.start && h < p.end;
      });
      return {
        name: p.name,
        attempts: periodAttempts.length,
        percentage: totalAttempts > 0 ? Math.round((periodAttempts.length / totalAttempts) * 100) : 0,
        avgScore:
          periodAttempts.length > 0
            ? Math.round(periodAttempts.reduce((s, a) => s + a.score, 0) / periodAttempts.length)
            : 0,
        avgTime:
          periodAttempts.length > 0
            ? Math.round(periodAttempts.reduce((s, a) => s + a.timeSpent, 0) / periodAttempts.length)
            : 0,
      };
    });

    const result = {
      heatmap: heatmapCells,
      hourlyDistribution,
      dailyDistribution: dailyDistributionSerialized,
      topPeakHours,
      lowActivityHours,
      summary: {
        totalAttempts,
        totalStudents,
        avgTimePerAttempt,
        avgScoreOverall,
        mostActiveDay: { name: mostActiveDay.name, attempts: mostActiveDay.attempts },
        mostActiveHour: { label: `${mostActiveHour.hour}:00`, attempts: mostActiveHour.attempts },
        bestScoringHour: { label: `${bestScoringHour.hour}:00`, avgScore: bestScoringHour.avgScore },
        periodStats,
      },
    };
    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
