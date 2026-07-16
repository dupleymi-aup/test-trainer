import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";

interface TeacherMetrics {
  teacherId: string;
  name: string;
  email: string;
  groupsCount: number;
  studentsCount: number;
  activeStudentsCount: number;
  totalAttempts: number;
  avgScore: number;
  avgEc: number;
  avgBv: number;
  activeStudentsRate: number;
  improvingStudents: number;
  decliningStudents: number;
  effectivenessScore: number;
  rank: number;
  trend: "improving" | "stable" | "declining";
  groups: Array<{
    id: string;
    name: string;
    studentCount: number;
    avgScore: number;
    activeRate: number;
  }>;
}

export async function GET(_request: Request) {
  return withErrorHandler(_request, async () => {
    unwrapGuard(await requireAdmin());

    const cacheKey = makeCacheKey("teacher-comparison");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const teachers = await db.user.findMany({
      where: { role: "TEACHER", deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        createdGroups: {
          select: {
            id: true,
            name: true,
            members: {
              select: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    attempts: {
                      select: {
                        score: true,
                        ecCoverage: true,
                        bvCoverage: true,
                        createdAt: true,
                      },
                      orderBy: { createdAt: "asc" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const teacherMetrics: TeacherMetrics[] = [];

    for (const t of teachers) {
      let totalStudents = 0;
      let activeStudentsCount = 0;
      let totalAttempts = 0;
      const allScores: number[] = [];
      const allEc: number[] = [];
      const allBv: number[] = [];
      let improvingStudents = 0;
      let decliningStudents = 0;
      const groups: TeacherMetrics["groups"] = [];

      for (const g of t.createdGroups) {
        const groupScores: number[] = [];
        let groupActive = 0;
        const groupStudentCount = g.members.length;

        for (const m of g.members) {
          const attempts = m.user.attempts;
          if (attempts.length === 0) continue;

          const avgScore = Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length);
          const avgEc = Math.round(attempts.reduce((s, a) => s + a.ecCoverage, 0) / attempts.length);
          const avgBv = Math.round(attempts.reduce((s, a) => s + a.bvCoverage, 0) / attempts.length);

          groupScores.push(avgScore);
          allScores.push(avgScore);
          allEc.push(avgEc);
          allBv.push(avgBv);
          totalAttempts += attempts.length;

          const lastAttempt = attempts[attempts.length - 1].createdAt;
          if (lastAttempt >= thirtyDaysAgo) {
            activeStudentsCount++;
            groupActive++;
          }

          // Student trend
          const first3 = attempts.slice(0, 3);
          const last3 = attempts.slice(-3);
          if (first3.length > 0 && last3.length > 0) {
            const firstAvg = first3.reduce((s, a) => s + a.score, 0) / first3.length;
            const lastAvg = last3.reduce((s, a) => s + a.score, 0) / last3.length;
            if (lastAvg - firstAvg > 10) improvingStudents++;
            else if (lastAvg - firstAvg < -10) decliningStudents++;
          }
        }

        groups.push({
          id: g.id,
          name: g.name,
          studentCount: groupStudentCount,
          avgScore: groupScores.length > 0 ? Math.round(groupScores.reduce((s, v) => s + v, 0) / groupScores.length) : 0,
          activeRate: groupStudentCount > 0 ? Math.round((groupActive / groupStudentCount) * 100) : 0,
        });

        totalStudents += groupStudentCount;
      }

      const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length) : 0;
      const avgEc = allEc.length > 0 ? Math.round(allEc.reduce((s, v) => s + v, 0) / allEc.length) : 0;
      const avgBv = allBv.length > 0 ? Math.round(allBv.reduce((s, v) => s + v, 0) / allBv.length) : 0;
      const activeStudentsRate = totalStudents > 0 ? Math.round((activeStudentsCount / totalStudents) * 100) : 0;

      // Effectiveness score: weighted composite
      // 30% avg score, 20% active rate, 20% improvement ratio, 15% EC coverage, 15% BV coverage
      const improvementRatio = (improvingStudents + decliningStudents) > 0
        ? improvingStudents / (improvingStudents + decliningStudents)
        : 0.5;
      const effectivenessScore = Math.round(
        avgScore * 0.3 +
        activeStudentsRate * 0.2 +
        improvementRatio * 100 * 0.2 +
        avgEc * 0.15 +
        avgBv * 0.15
      );

      const trend = improvingStudents > decliningStudents * 1.5
        ? "improving"
        : decliningStudents > improvingStudents * 1.5
          ? "declining"
          : "stable";

      teacherMetrics.push({
        teacherId: t.id,
        name: t.name || t.email || "Unknown",
        email: t.email || "",
        groupsCount: t.createdGroups.length,
        studentsCount: totalStudents,
        activeStudentsCount,
        totalAttempts,
        avgScore,
        avgEc,
        avgBv,
        activeStudentsRate,
        improvingStudents,
        decliningStudents,
        effectivenessScore,
        rank: 0, // will be set after sorting
        trend,
        groups,
      });
    }

    // Sort by effectiveness score and assign ranks
    teacherMetrics.sort((a, b) => b.effectivenessScore - a.effectivenessScore);
    teacherMetrics.forEach((t, i) => { t.rank = i + 1; });

    // Platform averages
    const platformAvg = {
      avgScore: teacherMetrics.length > 0
        ? Math.round(teacherMetrics.reduce((s, t) => s + t.avgScore, 0) / teacherMetrics.length)
        : 0,
      activeRate: teacherMetrics.length > 0
        ? Math.round(teacherMetrics.reduce((s, t) => s + t.activeStudentsRate, 0) / teacherMetrics.length)
        : 0,
      effectivenessScore: teacherMetrics.length > 0
        ? Math.round(teacherMetrics.reduce((s, t) => s + t.effectivenessScore, 0) / teacherMetrics.length)
        : 0,
    };

    const result = {
      teachers: teacherMetrics,
      platformAvg,
      totalTeachers: teacherMetrics.length,
    };
    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
