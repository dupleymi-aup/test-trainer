import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { withErrorHandler } from "@/lib/api-error-handler";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

/**
 * Teacher effectiveness analysis.
 * For each teacher, compute:
 * - Number of groups, students, total attempts
 * - Average student score and improvement rate
 * - Student retention (students who completed >50% tasks)
 * - Risk rate (% of students at high/critical risk)
 * - Teacher composite score
 */
export async function GET() {
  return withErrorHandler(undefined, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const cacheKey = makeCacheKey("teacher-effectiveness");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const totalTaskCount = tasks.length;

    const teachers = await db.user.findMany({
      where: { role: "TEACHER", deletedAt: null },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        university: true,
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
                    group: true,
                    university: true,
                    createdAt: true,
                    attempts: {
                      select: { taskId: true, score: true, createdAt: true },
                      take: 50_000,
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

    const teacherAnalysis = teachers.map((teacher) => {
      const groups = teacher.createdGroups;
      const allStudents = groups.flatMap((g) =>
        g.members.map((m) => m.user)
      );
      const uniqueStudentIds = new Set(allStudents.map((s) => s.id));

      // Per-student analysis
      const studentMetrics = allStudents.map((student) => {
        const attempts = student.attempts;
        if (attempts.length === 0) {
          return { bestScore: 0, avgScore: 0, completedTasks: 0, trend: "none" as const, risk: "critical" as const };
        }

        const taskScores: Record<string, number[]> = {};
        for (const a of attempts) {
          if (!taskScores[a.taskId]) taskScores[a.taskId] = [];
          taskScores[a.taskId].push(a.score);
        }

        const bestScore = Math.max(...attempts.map((a) => a.score));
        const avgScore = Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length);
        const completedTasks = Object.values(taskScores).filter((scores) => Math.max(...scores) >= 60).length;

        // Trend
        const first3 = attempts.slice(0, 3).map((a) => a.score);
        const last3 = attempts.slice(-3).map((a) => a.score);
        const firstAvg = first3.reduce((s, v) => s + v, 0) / first3.length;
        const lastAvg = last3.reduce((s, v) => s + v, 0) / last3.length;
        const trend = attempts.length >= 6
          ? (lastAvg - firstAvg > 15 ? "improving" : lastAvg - firstAvg < -15 ? "declining" : "stable")
          : "stable";

        // Risk
        const risk = bestScore < 30 ? "critical" : bestScore < 50 ? "high" : bestScore < 70 ? "medium" : "low";

        return { bestScore, avgScore, completedTasks, trend, risk };
      });

      const avgStudentScore = studentMetrics.length > 0
        ? Math.round(studentMetrics.reduce((s, m) => s + m.avgScore, 0) / studentMetrics.length)
        : 0;

      const improvingCount = studentMetrics.filter((m) => m.trend === "improving").length;
      const improvementRate = studentMetrics.length > 0
        ? Math.round((improvingCount / studentMetrics.length) * 100)
        : 0;

      const retentionCount = studentMetrics.filter((m) => m.completedTasks >= totalTaskCount * 0.5).length;
      const retentionRate = studentMetrics.length > 0
        ? Math.round((retentionCount / studentMetrics.length) * 100)
        : 0;

      const highRiskCount = studentMetrics.filter((m) => m.risk === "high" || m.risk === "critical").length;
      const riskRate = studentMetrics.length > 0
        ? Math.round((highRiskCount / studentMetrics.length) * 100)
        : 0;

      // Composite score (0-100)
      const compositeScore = Math.round(
        avgStudentScore * 0.3 +
        improvementRate * 0.25 +
        retentionRate * 0.25 +
        (100 - riskRate) * 0.2
      );

      // Activity score: attempts per student
      const totalAttempts = studentMetrics.length;
      const attemptsPerStudent = uniqueStudentIds.size > 0
        ? Math.round(totalAttempts / uniqueStudentIds.size * 10) / 10
        : 0;

      return {
        teacherId: teacher.id,
        name: teacher.name || teacher.email || "Unknown",
        university: teacher.university || "—",
        groupsCount: groups.length,
        studentsCount: uniqueStudentIds.size,
        totalAttempts,
        attemptsPerStudent,
        avgStudentScore,
        improvementRate,
        retentionRate,
        riskRate,
        compositeScore,
        grade: compositeScore >= 80 ? "A" : compositeScore >= 65 ? "B" : compositeScore >= 50 ? "C" : "D",
      };
    });

    // Sort by composite score
    teacherAnalysis.sort((a, b) => b.compositeScore - a.compositeScore);

    const avgComposite = teacherAnalysis.length > 0
      ? Math.round(teacherAnalysis.reduce((s, t) => s + t.compositeScore, 0) / teacherAnalysis.length)
      : 0;

    const result = {
      teachers: teacherAnalysis,
      summary: {
        totalTeachers: teacherAnalysis.length,
        avgComposite,
        topTeacher: teacherAnalysis[0]?.name || "—",
        avgImprovementRate: teacherAnalysis.length > 0
          ? Math.round(teacherAnalysis.reduce((s, t) => s + t.improvementRate, 0) / teacherAnalysis.length)
          : 0,
        avgRetentionRate: teacherAnalysis.length > 0
          ? Math.round(teacherAnalysis.reduce((s, t) => s + t.retentionRate, 0) / teacherAnalysis.length)
          : 0,
      },
    };

    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
