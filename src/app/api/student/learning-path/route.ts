import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { getCache, setCache } from "@/lib/analytics-cache";
import { safeJsonParse } from "@/lib/utils";

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    const auth = unwrapGuard(await requireStudent());

    const cacheKey = `student-learning-path:${auth.userId}`;
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const groupIds = (
      await db.userGroup.findMany({
        where: { userId: auth.userId },
        select: { groupId: true },
      })
    ).map((g) => g.groupId);

    if (groupIds.length === 0) {
      return NextResponse.json({ assignments: [], progress: {} });
    }

    const assignments = await db.templateAssignment.findMany({
      where: { groupId: { in: groupIds } },
      include: {
        template: { select: { id: true, name: true, description: true, taskIds: true, topics: true, estimatedHours: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { assignedAt: "desc" },
    });

    const allTaskIds = assignments.flatMap((a) => safeJsonParse(a.template.taskIds, [] as number[]));

    const completedAttempts = allTaskIds.length > 0
      ? await db.attempt.findMany({
          where: {
            userId: auth.userId,
            taskId: { in: [...new Set(allTaskIds)].map(String) },
          },
          select: { taskId: true, score: true },
          orderBy: { score: "desc" },
        })
      : [];

    const bestScores: Record<string, number> = {};
    for (const a of completedAttempts) {
      if (!bestScores[a.taskId] || a.score > bestScores[a.taskId]) {
        bestScores[a.taskId] = a.score;
      }
    }

    const progress: Record<string, { templateId: string; completedTasks: number; totalTasks: number }> = {};
    for (const assignment of assignments) {
      const taskIds = safeJsonParse(assignment.template.taskIds, [] as number[]);
      const completed = taskIds.filter((tid) => (bestScores[String(tid)] || 0) >= 60).length;
      progress[assignment.template.id] = { templateId: assignment.template.id, completedTasks: completed, totalTasks: taskIds.length };
    }

    const responseData = { assignments, progress };
    setCache(cacheKey, responseData, 300000);
    return NextResponse.json(responseData);
  });
}
