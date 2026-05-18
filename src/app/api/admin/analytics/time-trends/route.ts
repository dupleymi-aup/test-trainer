import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  const now = new Date();

  // Get all attempts
  const attempts = await db.attempt.findMany({
    select: {
      userId: true,
      score: true,
      ecCoverage: true,
      bvCoverage: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Monthly trends (last 12 months)
  const monthlyMap: Record<string, { scores: number[]; ecs: number[]; bvs: number[]; count: number }> = {};
  attempts.forEach((a) => {
    const month = a.createdAt.toISOString().slice(0, 7);
    if (!monthlyMap[month]) monthlyMap[month] = { scores: [], ecs: [], bvs: [], count: 0 };
    monthlyMap[month].scores.push(a.score);
    monthlyMap[month].ecs.push(a.ecCoverage);
    monthlyMap[month].bvs.push(a.bvCoverage);
    monthlyMap[month].count++;
  });

  const monthlyTrends = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({
      month,
      avgScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
      avgEc: Math.round(data.ecs.reduce((s, v) => s + v, 0) / data.ecs.length),
      avgBv: Math.round(data.bvs.reduce((s, v) => s + v, 0) / data.bvs.length),
      attemptsCount: data.count,
    }));

  // Weekly patterns (day of week)
  const dayOfWeekMap: Record<number, { count: number; scores: number[] }> = {};
  attempts.forEach((a) => {
    const day = a.createdAt.getDay(); // 0=Sunday, 1=Monday, ...
    if (!dayOfWeekMap[day]) dayOfWeekMap[day] = { count: 0, scores: [] };
    dayOfWeekMap[day].count++;
    dayOfWeekMap[day].scores.push(a.score);
  });

  const weeklyPatterns = Array.from({ length: 7 }, (_, i) => {
    const data = dayOfWeekMap[i];
    const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    return {
      day: dayNames[i],
      dayIndex: i,
      attemptsCount: data?.count || 0,
      avgScore: data && data.scores.length > 0
        ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length)
        : 0,
    };
  });

  // Hourly patterns (hour of day)
  const hourMap: Record<number, { count: number; scores: number[] }> = {};
  attempts.forEach((a) => {
    const hour = a.createdAt.getHours();
    if (!hourMap[hour]) hourMap[hour] = { count: 0, scores: [] };
    hourMap[hour].count++;
    hourMap[hour].scores.push(a.score);
  });

  const hourlyPatterns = Array.from({ length: 24 }, (_, i) => {
    const data = hourMap[i];
    return {
      hour: i,
      attemptsCount: data?.count || 0,
      avgScore: data && data.scores.length > 0
        ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length)
        : 0,
    };
  });

  // Cohort analysis (by registration month)
  const students = await db.user.findMany({
    where: { role: "STUDENT", deletedAt: null },
    select: { id: true, createdAt: true },
  });

  const cohortMap: Record<string, { total: number; students: string[] }> = {};
  students.forEach((s) => {
    const cohort = s.createdAt.toISOString().slice(0, 7);
    if (!cohortMap[cohort]) cohortMap[cohort] = { total: 0, students: [] };
    cohortMap[cohort].total++;
    cohortMap[cohort].students.push(s.id);
  });

  // For each cohort, track their attempts over subsequent months
  const cohortProgress: Array<{
    cohort: string;
    totalStudents: number;
    monthlyProgress: Array<{ month: string; activeStudents: number; avgScore: number; attemptsCount: number }>;
  }> = [];

  for (const [cohort, data] of Object.entries(cohortMap)) {
    const cohortStart = new Date(cohort + "-01T00:00:00Z");
    const studentIds = new Set(data.students);

    // Track attempts for this cohort
    const cohortAttempts = attempts.filter((a) => studentIds.has(a.userId));

    const monthlyProgressMap: Record<string, { scores: number[]; activeStudents: Set<string>; count: number }> = {};
    cohortAttempts.forEach((a) => {
      const month = a.createdAt.toISOString().slice(0, 7);
      if (!monthlyProgressMap[month]) {
        monthlyProgressMap[month] = { scores: [], activeStudents: new Set(), count: 0 };
      }
      monthlyProgressMap[month].scores.push(a.score);
      monthlyProgressMap[month].activeStudents.add(a.userId);
      monthlyProgressMap[month].count++;
    });

    const monthlyProgress = Object.entries(monthlyProgressMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, mdata]) => ({
        month,
        activeStudents: mdata.activeStudents.size,
        avgScore: mdata.scores.length > 0
          ? Math.round(mdata.scores.reduce((s, v) => s + v, 0) / mdata.scores.length)
          : 0,
        attemptsCount: mdata.count,
      }));

    cohortProgress.push({
      cohort,
      totalStudents: data.total,
      monthlyProgress,
    });
  }

  cohortProgress.sort((a, b) => a.cohort.localeCompare(b.cohort));

  // Growth rates
  const growthRates: {
    weekOverWeek: number;
    monthOverMonth: number;
  } = { weekOverWeek: 0, monthOverMonth: 0 };

  if (monthlyTrends.length >= 2) {
    const last = monthlyTrends[monthlyTrends.length - 1];
    const prev = monthlyTrends[monthlyTrends.length - 2];
    growthRates.monthOverMonth = prev.attemptsCount > 0
      ? Math.round(((last.attemptsCount - prev.attemptsCount) / prev.attemptsCount) * 100)
      : 0;
  }

  // Weekly growth (compare last 2 weeks)
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const [lastWeekAttempts, prevWeekAttempts] = await Promise.all([
    db.attempt.count({ where: { createdAt: { gte: weekAgo } } }),
    db.attempt.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
  ]);

  growthRates.weekOverWeek = prevWeekAttempts > 0
    ? Math.round(((lastWeekAttempts - prevWeekAttempts) / prevWeekAttempts) * 100)
    : 0;

  // Seasonal patterns (identify peak activity periods)
  const peakHours = hourlyPatterns
    .sort((a, b) => b.attemptsCount - a.attemptsCount)
    .slice(0, 3)
    .map((h) => h.hour);

  const peakDays = weeklyPatterns
    .sort((a, b) => b.attemptsCount - a.attemptsCount)
    .slice(0, 3)
    .map((d) => d.day);

  // Peak months
  const peakMonths = monthlyTrends
    .sort((a, b) => b.attemptsCount - a.attemptsCount)
    .slice(0, 3)
    .map((m) => m.month);

  return NextResponse.json({
    monthlyTrends,
    weeklyPatterns,
    hourlyPatterns,
    cohortProgress,
    growthRates,
    seasonalInsights: {
      peakHours,
      peakDays,
      peakMonths,
    },
  });
}
