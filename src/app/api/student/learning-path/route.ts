import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { withErrorHandler } from "@/lib/api-error-handler";

export async function GET() {
  return withErrorHandler(undefined, async () => {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;

    const groupIds = (
      await db.userGroup.findMany({
        where: { userId: auth.session.userId },
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

    const allTaskIds = assignments.flatMap((a) => {
      try { return JSON.parse(a.template.taskIds) as number[]; } catch { return []; }
    });

    const completedAttempts = allTaskIds.length > 0
      ? await db.attempt.findMany({
          where: {
            userId: auth.session.userId,
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
      const taskIds: number[] = (() => { try { return JSON.parse(assignment.template.taskIds); } catch { return []; } })();
      const completed = taskIds.filter((tid) => (bestScores[String(tid)] || 0) >= 60).length;
      progress[assignment.template.id] = { templateId: assignment.template.id, completedTasks: completed, totalTasks: taskIds.length };
    }

    return NextResponse.json({ assignments, progress });
  });
}
