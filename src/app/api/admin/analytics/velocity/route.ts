import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    unwrapGuard(await requireAdmin());

    const cacheKey = makeCacheKey("velocity");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const attempts = await db.attempt.findMany({
      select: { userId: true, createdAt: true, taskId: true, score: true },
      orderBy: { createdAt: "asc" },
      take: 100000,
    });

    // Get student info
    const studentIds = [...new Set(attempts.map((a) => a.userId))];
    const students = await db.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, group: true },
    });
    const studentMap = new Map(students.map((s) => [s.id, s]));

    // Per-student attempts
    const studentAttempts: Record<string, typeof attempts> = {};
    for (const a of attempts) {
      if (!studentAttempts[a.userId]) studentAttempts[a.userId] = [];
      studentAttempts[a.userId].push(a);
    }

    const now = new Date();
    const studentVelocity: { studentId: string; name: string; group: string | null; attemptsPerWeek: number; totalAttempts: number; weeksActive: number; avgScore: number; trend: "improving" | "stable" | "declining" }[] = [];

    for (const [userId, userAttempts] of Object.entries(studentAttempts)) {
      if (userAttempts.length < 2) continue;
      const student = studentMap.get(userId);
      if (!student) continue;

      const firstDate = new Date(userAttempts[0].createdAt);
      const lastDate = new Date(userAttempts[userAttempts.length - 1].createdAt);
      const weeksActive = Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
      const attemptsPerWeek = Math.round((userAttempts.length / weeksActive) * 10) / 10;
      const avgScore = Math.round(userAttempts.reduce((s, a) => s + a.score, 0) / userAttempts.length);

      // Trend: first half vs last half
      const mid = Math.floor(userAttempts.length / 2);
      const firstHalf = userAttempts.slice(0, mid);
      const lastHalf = userAttempts.slice(mid);
      const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s, a) => s + a.score, 0) / firstHalf.length : 0;
      const lastAvg = lastHalf.length > 0 ? lastHalf.reduce((s, a) => s + a.score, 0) / lastHalf.length : 0;
      const delta = lastAvg - firstAvg;
      const trend: "improving" | "stable" | "declining" = delta > 10 ? "improving" : delta < -10 ? "declining" : "stable";

      studentVelocity.push({
        studentId: userId, name: student.name || "", group: student.group,
        attemptsPerWeek, totalAttempts: userAttempts.length, weeksActive, avgScore, trend,
      });
    }

    studentVelocity.sort((a, b) => b.attemptsPerWeek - a.attemptsPerWeek);

    // Platform-wide weekly trend (last 12 weeks)
    const weeklyTrend: { week: string; attemptsCount: number; avgScore: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekAttempts = attempts.filter((a) => {
        const d = new Date(a.createdAt);
        return d >= weekStart && d < weekEnd;
      });

      if (weekAttempts.length > 0) {
        weeklyTrend.push({
          week: `${weekStart.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}`,
          attemptsCount: weekAttempts.length,
          avgScore: Math.round(weekAttempts.reduce((s, a) => s + a.score, 0) / weekAttempts.length),
        });
      }
    }

    const result = { studentVelocity: studentVelocity.slice(0, 50), weeklyTrend };
    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
