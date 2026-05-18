import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireTeacherOrAdmin();
  if ("response" in guard) return guard.response;

  // Fetch all students with attempts
  const students = await db.user.findMany({
    where: {
      role: "STUDENT",
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      group: true,
      createdAt: true,
      attempts: {
        orderBy: { createdAt: "asc" },
        select: {
          score: true,
          createdAt: true,
        },
      },
    },
  });

  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const atRiskStudents: Array<{
    student: {
      id: string;
      name: string | null;
      email: string | null;
      group: string | null;
    };
    riskFactors: string[];
    stats: {
      bestScore: number;
      avgScore: number;
      lastAttemptDate: string | null;
      attemptsCount: number;
      trend: number;
    };
    recommendation: string;
  }> = [];

  students.forEach((student) => {
    const attempts = student.attempts;
    const riskFactors: string[] = [];

    // Calculate stats
    const bestScore =
      attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;
    const avgScore =
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
        : 0;
    const lastAttemptDate =
      attempts.length > 0
        ? attempts[attempts.length - 1].createdAt
        : null;

    // 1. Low performer: bestScore < 50
    if (bestScore < 50 && attempts.length > 0) {
      riskFactors.push("low_performer");
    }

    // 2. Declining trend: last 3 avg < first 3 avg by >15 points
    if (attempts.length >= 6) {
      const first3 = attempts.slice(0, 3);
      const last3 = attempts.slice(-3);
      const firstAvg = first3.reduce((s, a) => s + a.score, 0) / first3.length;
      const lastAvg = last3.reduce((s, a) => s + a.score, 0) / last3.length;
      const trend = lastAvg - firstAvg;
      if (trend < -15) {
        riskFactors.push("declining");
      }
    }

    // 3. Inactive: last attempt > 14 days ago AND has at least 1 previous attempt
    if (
      attempts.length > 0 &&
      lastAttemptDate &&
      lastAttemptDate < fourteenDaysAgo
    ) {
      riskFactors.push("inactive");
    }

    // 4. Low engagement: attempts < 3 AND registered > 7 days ago
    if (attempts.length < 3 && student.createdAt < sevenDaysAgo) {
      riskFactors.push("low_engagement");
    }

    // Only include if at least one risk factor
    if (riskFactors.length > 0) {
      // Generate recommendation
      const recommendations: string[] = [];
      if (riskFactors.includes("low_performer")) {
        recommendations.push(
          "Рекомендуется повторить теорию и разобрать типовые ошибки"
        );
      }
      if (riskFactors.includes("declining")) {
        recommendations.push(
          "Необходимо выяснить причину снижения результатов и оказать поддержку"
        );
      }
      if (riskFactors.includes("inactive")) {
        recommendations.push(
          "Связаться со студентом и мотивировать продолжить занятия"
        );
      }
      if (riskFactors.includes("low_engagement")) {
        recommendations.push(
          "Предложить дополнительные задания и проверить доступ к материалу"
        );
      }

      atRiskStudents.push({
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          group: student.group,
        },
        riskFactors,
        stats: {
          bestScore,
          avgScore,
          lastAttemptDate: lastAttemptDate?.toISOString() || null,
          attemptsCount: attempts.length,
          trend:
            attempts.length >= 6
              ? Math.round(
                  (attempts.slice(-3).reduce((s, a) => s + a.score, 0) / 3) -
                    (attempts.slice(0, 3).reduce((s, a) => s + a.score, 0) / 3)
                )
              : 0,
        },
        recommendation: recommendations.join(". "),
      });
    }
  });

  // Sort by number of risk factors (most at-risk first)
  atRiskStudents.sort((a, b) => b.riskFactors.length - a.riskFactors.length);

  return NextResponse.json({ atRiskStudents });
}
