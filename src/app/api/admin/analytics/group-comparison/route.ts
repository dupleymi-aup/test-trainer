import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { tTest } from "@/lib/analytics-queries";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    unwrapGuard(await requireAdmin());

    const cacheKey = makeCacheKey("group-comparison");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const groups = await db.group.findMany({
      take: 100,
      select: {
        id: true,
        name: true,
        members: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                attempts: {
                  select: {
                    score: true,
                    ecCoverage: true,
                    bvCoverage: true,
                    timeSpent: true,
                    createdAt: true,
                  },
                  take: 50_000,
                  orderBy: { createdAt: "asc" },
                },
              },
            },
          },
        },
      },
    });

    const groupMetrics = groups
      .map((g) => {
        const allAttempts = g.members.flatMap((m) => m.user.attempts);
        if (allAttempts.length === 0) return null;

        const scores = allAttempts.map((a) => a.score);
        const avgScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
        const avgEc = Math.round(allAttempts.reduce((s, a) => s + a.ecCoverage, 0) / allAttempts.length);
        const avgBv = Math.round(allAttempts.reduce((s, a) => s + a.bvCoverage, 0) / allAttempts.length);
        const avgTime = Math.round(allAttempts.reduce((s, a) => s + a.timeSpent, 0) / allAttempts.length);

        // Trend: compare first half vs second half
        const mid = Math.floor(scores.length / 2);
        const firstHalf = scores.slice(0, mid).reduce((s, v) => s + v, 0) / (mid || 1);
        const secondHalf = scores.slice(mid).reduce((s, v) => s + v, 0) / (scores.length - mid || 1);
        const trend = secondHalf - firstHalf > 5 ? "improving" : secondHalf - firstHalf < -5 ? "declining" : "stable";

        const students = g.members.map((m) => ({
          studentId: m.user.id,
          name: m.user.name || "Unknown",
          avgScore: m.user.attempts.length > 0
            ? Math.round(m.user.attempts.reduce((s, a) => s + a.score, 0) / m.user.attempts.length)
            : 0,
          attempts: m.user.attempts.length,
        }));

        return {
          groupId: g.id,
          groupName: g.name,
          metrics: {
            avgScore,
            avgEc,
            avgBv,
            avgTime,
            attemptCount: allAttempts.length,
            studentCount: g.members.length,
          },
          trend,
          students,
          scores,
        };
      })
      .filter(Boolean) as { groupId: string; groupName: string; metrics: Record<string, number>; trend: string; students: { studentId: string; name: string; avgScore: number; attempts: number }[]; scores: number[] }[];

    // Statistical significance between all group pairs
    const statisticalSignificance: { groupA: string; groupB: string; t: number; significant: boolean; pApprox: number }[] = [];
    for (let i = 0; i < groupMetrics.length; i++) {
      for (let j = i + 1; j < groupMetrics.length; j++) {
        const result = tTest(groupMetrics[i].scores, groupMetrics[j].scores);
        if (result) {
          statisticalSignificance.push({
            groupA: groupMetrics[i].groupName,
            groupB: groupMetrics[j].groupName,
            t: result.t,
            significant: result.significant,
            pApprox: result.pApprox,
          });
        }
      }
    }

    // Remove scores from output
    const output = groupMetrics.map(({ scores: _scores, ...rest }) => rest);

    const result = { groups: output, statisticalSignificance };
    setCache(cacheKey, result, DEFAULT_TTL.medium);
    return NextResponse.json(result);
  });
}
