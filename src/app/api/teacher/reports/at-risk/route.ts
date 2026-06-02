import { NextResponse } from "next/server";
import { requireTeacherOrAdmin, requireTeacherGroup } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    // Require groupId to prevent teachers from accessing all students on the platform
    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    const groupCheck = await requireTeacherGroup(groupId, session);
    if ("response" in groupCheck) return groupCheck.response;

    // Get students in this group only
    const userGroups = await db.userGroup.findMany({
      where: { groupId: groupCheck.group.id },
      select: { userId: true },
    });
    const userIds = userGroups.map((ug) => ug.userId);

    const students = await db.user.findMany({
      where: {
        id: { in: userIds },
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
          take: 100,
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

      const bestScore =
        attempts.reduce((max, a) => Math.max(max, a.score), 0);
      const avgScore =
        attempts.length > 0
          ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
          : 0;
      const lastAttemptDate =
        attempts.length > 0
          ? attempts[attempts.length - 1].createdAt
          : null;

      if (bestScore < 50 && attempts.length > 0) {
        riskFactors.push("low_performer");
      }

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

      if (
        attempts.length > 0 &&
        lastAttemptDate &&
        lastAttemptDate < fourteenDaysAgo
      ) {
        riskFactors.push("inactive");
      }

      if (attempts.length < 3 && student.createdAt < sevenDaysAgo) {
        riskFactors.push("low_engagement");
      }

      if (riskFactors.length > 0) {
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

    atRiskStudents.sort((a, b) => b.riskFactors.length - a.riskFactors.length);

    return NextResponse.json({ atRiskStudents });
  } catch (error) {
    logger.error("Failed to generate at-risk report", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Failed to generate at-risk report" },
      { status: 500 }
    );
  }
}
