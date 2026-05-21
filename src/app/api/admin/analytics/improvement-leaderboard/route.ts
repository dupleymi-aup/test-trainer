import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

export async function GET() {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  const cacheKey = makeCacheKey("improvement-leaderboard");
  const cached = getCache(cacheKey);
  if (cached) return NextResponse.json(cached);

  const students = await db.user.findMany({
    where: { role: "STUDENT", isActive: true, deletedAt: null },
    select: { id: true, name: true, email: true, group: true, university: true, attempts: { select: { score: true, createdAt: true }, orderBy: { createdAt: "asc" } } },
  });

  const studentImprovement: { studentId: string; name: string; group: string | null; university: string | null; firstAvg: number; lastAvg: number; scoreDelta: number; percentChange: number; attemptsCount: number }[] = [];

  for (const s of students) {
    const attempts = s.attempts;
    if (attempts.length < 4) continue;

    const n = Math.min(5, Math.floor(attempts.length / 2));
    const firstN = attempts.slice(0, n);
    const lastN = attempts.slice(-n);

    const firstAvg = Math.round(firstN.reduce((sum, a) => sum + a.score, 0) / firstN.length);
    const lastAvg = Math.round(lastN.reduce((sum, a) => sum + a.score, 0) / lastN.length);
    const delta = lastAvg - firstAvg;
    const pctChange = firstAvg > 0 ? Math.round((delta / firstAvg) * 100) : 0;

    studentImprovement.push({
      studentId: s.id, name: s.name || s.email || "", group: s.group, university: s.university,
      firstAvg, lastAvg, scoreDelta: delta, percentChange: pctChange, attemptsCount: attempts.length,
    });
  }

  // Sort by delta descending (most improved first)
  studentImprovement.sort((a, b) => b.scoreDelta - a.scoreDelta);

  // Group improvement
  const groupMap: Record<string, { totalDelta: number; count: number }> = {};
  for (const s of studentImprovement) {
    const g = s.group || "Без группы";
    if (!groupMap[g]) groupMap[g] = { totalDelta: 0, count: 0 };
    groupMap[g].totalDelta += s.scoreDelta;
    groupMap[g].count++;
  }

  const groupImprovement = Object.entries(groupMap)
    .map(([name, data]) => ({ groupName: name, avgDelta: Math.round(data.totalDelta / data.count), studentCount: data.count }))
    .sort((a, b) => b.avgDelta - a.avgDelta);

  // University improvement
  const uniMap: Record<string, { totalDelta: number; count: number }> = {};
  for (const s of studentImprovement) {
    const u = s.university || "Не указан";
    if (!uniMap[u]) uniMap[u] = { totalDelta: 0, count: 0 };
    uniMap[u].totalDelta += s.scoreDelta;
    uniMap[u].count++;
  }

  const universityImprovement = Object.entries(uniMap)
    .map(([name, data]) => ({ university: name, avgDelta: Math.round(data.totalDelta / data.count), studentCount: data.count }))
    .sort((a, b) => b.avgDelta - a.avgDelta);

  const result = { studentImprovement: studentImprovement.slice(0, 50), groupImprovement, universityImprovement };
  setCache(cacheKey, result, DEFAULT_TTL.expensive);
  return NextResponse.json(result);
}
