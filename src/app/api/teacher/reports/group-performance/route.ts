import { NextResponse } from "next/server";
import { requireTeacherOrAdmin, requireTeacherGroup } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { parseSearchParams } from "@/lib/api-error-handler";
import { z } from "zod";

const groupPerformanceParamsSchema = z.object({
  groupId: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const params = parseSearchParams(req, groupPerformanceParamsSchema);
    if (!params.success) return params.errorResponse;
    const { groupId, startDate, endDate } = params.data;

    const groupCheck = await requireTeacherGroup(groupId, session);
    if ("response" in groupCheck) return groupCheck.response;

    // Fetch students in this group only
    const usersInGroup = await db.userGroup.findMany({
      where: { groupId: groupCheck.group.id },
      select: { userId: true },
    });
    const userIds = usersInGroup.map((u) => u.userId);

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
        university: true,
        createdAt: true,
        attempts: {
          where: {
            createdAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined,
            },
          },
          orderBy: { createdAt: "asc" },
          select: {
            score: true,
            ecCoverage: true,
            bvCoverage: true,
            correctness: true,
            createdAt: true,
          },
        },
      },
    });

    // Calculate trend: compare first 5 vs last 5 attempts
    const calculateTrend = (
      attempts: Array<{ score: number }>
    ): "improving" | "stable" | "declining" => {
      if (attempts.length < 6) return "stable";
      const first5 = attempts.slice(0, 5);
      const last5 = attempts.slice(-5);
      const firstAvg = first5.reduce((s, a) => s + a.score, 0) / first5.length;
      const lastAvg = last5.reduce((s, a) => s + a.score, 0) / last5.length;
      const delta = lastAvg - firstAvg;
      if (delta > 10) return "improving";
      if (delta < -10) return "declining";
      return "stable";
    };

    // Build group response
    const groupName = students[0]?.group || "Без группы";
    const activeThreshold = new Date();
    activeThreshold.setDate(activeThreshold.getDate() - 30);

    const studentData = students.map((student) => {
      const attempts = student.attempts;
      const bestScore = attempts.reduce((max, a) => Math.max(max, a.score), 0);
      const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0;
      const avgEc = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.ecCoverage, 0) / attempts.length) : 0;
      const avgBv = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.bvCoverage, 0) / attempts.length) : 0;
      const lastAttemptDate = attempts.length > 0 ? attempts[attempts.length - 1].createdAt.toISOString() : null;
      const trend = calculateTrend(attempts);

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        group: student.group,
        university: student.university,
        bestScore,
        avgScore,
        avgEc,
        avgBv,
        attemptsCount: attempts.length,
        lastAttemptDate,
        trend,
      };
    });

    const groups = [{
      groupName,
      studentCount: studentData.length,
      avgBestScore: studentData.length > 0 ? Math.round(studentData.reduce((s, st) => s + st.bestScore, 0) / studentData.length) : 0,
      avgEc: studentData.length > 0 ? Math.round(studentData.reduce((s, st) => s + st.avgEc, 0) / studentData.length) : 0,
      avgBv: studentData.length > 0 ? Math.round(studentData.reduce((s, st) => s + st.avgBv, 0) / studentData.length) : 0,
      totalAttempts: studentData.reduce((s, st) => s + st.attemptsCount, 0),
      activeStudents: studentData.filter((s) => s.lastAttemptDate && new Date(s.lastAttemptDate) > activeThreshold).length,
      inactiveStudents: studentData.filter((s) => !s.lastAttemptDate || new Date(s.lastAttemptDate) <= activeThreshold).length,
      students: studentData,
    }];

    return NextResponse.json({ groups });
  } catch (error) {
    logger.error("Failed to generate group performance report", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Failed to generate group performance report" },
      { status: 500 }
    );
  }
}
