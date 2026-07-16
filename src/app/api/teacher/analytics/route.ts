import { NextResponse } from "next/server";
import { requireTeacherOrAdmin, requireTeacherGroup } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { parseSearchParams, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { z } from "zod";

const analyticsParamsSchema = z.object({
  groupId: z.string().min(1),
});

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireTeacherOrAdmin());

    const params = parseSearchParams(req, analyticsParamsSchema);
    if (!params.success) return params.errorResponse;
    const { groupId } = params.data;

    const groupCheck = await requireTeacherGroup(groupId, session);
    if ("response" in groupCheck) return groupCheck.response;

    // Get student IDs in this group
    const userGroups = await db.userGroup.findMany({
      where: { groupId: groupCheck.group.id },
      select: { userId: true },
    });
    const userIds = userGroups.map((ug) => ug.userId);

    if (userIds.length === 0) {
      return NextResponse.json({
        distribution: { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 },
        taskDifficulty: [],
        overallAvg: 0,
        totalAttempts: 0,
      });
    }

    const attempts = await db.attempt.findMany({
      where: { userId: { in: userIds } },
      select: {
        score: true,
        ecCoverage: true,
        bvCoverage: true,
        taskId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // Score distribution
    const distribution = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
    attempts.forEach((a) => {
      if (a.score <= 20) distribution["0-20"]++;
      else if (a.score <= 40) distribution["21-40"]++;
      else if (a.score <= 60) distribution["41-60"]++;
      else if (a.score <= 80) distribution["61-80"]++;
      else distribution["81-100"]++;
    });

    // Task difficulty (by average score)
    const taskScores: Record<string, number[]> = {};
    attempts.forEach((a) => {
      if (!taskScores[a.taskId]) taskScores[a.taskId] = [];
      taskScores[a.taskId].push(a.score);
    });

    const taskDifficulty = Object.entries(taskScores).map(([taskId, scores]) => ({
      taskId,
      avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      attemptsCount: scores.length,
    }));

    // Overall stats
    const overallAvg = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0;

    return NextResponse.json({
      distribution,
      taskDifficulty,
      overallAvg,
      totalAttempts: attempts.length,
    });
  });
}
