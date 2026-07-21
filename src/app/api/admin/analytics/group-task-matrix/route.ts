import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

/**
 * Group task comparison matrix.
 * For each group × task combination, compute:
 * - Students who attempted, passed, failed
 * - Average score, best score
 * - Comparison with platform average
 */
export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    unwrapGuard(await requireAdmin());

    const cacheKey = makeCacheKey("group-task-matrix");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const PASS_THRESHOLD = 60;

    const groups = await db.group.findMany({
      select: { id: true, name: true },
    });

    const allAttempts = await db.attempt.findMany({
      select: { taskId: true, userId: true, score: true },
      take: 50_000,
    });

    // Get group members
    const groupMembers = await db.userGroup.findMany({
      where: { groupId: { in: groups.map((g) => g.id) } },
      select: { userId: true, groupId: true },
    });

    const membersByGroup: Record<string, Set<string>> = {};
    for (const m of groupMembers) {
      if (!membersByGroup[m.groupId]) membersByGroup[m.groupId] = new Set();
      membersByGroup[m.groupId].add(m.userId);
    }

    // Group attempts by user and task
    const attemptsByUserTask: Record<string, Record<string, number[]>> = {};
    for (const a of allAttempts) {
      if (!attemptsByUserTask[a.userId]) attemptsByUserTask[a.userId] = {};
      if (!attemptsByUserTask[a.userId][a.taskId]) attemptsByUserTask[a.userId][a.taskId] = [];
      attemptsByUserTask[a.userId][a.taskId].push(a.score);
    }

    // Platform average per task
    const taskScores: Record<string, number[]> = {};
    for (const a of allAttempts) {
      if (!taskScores[a.taskId]) taskScores[a.taskId] = [];
      taskScores[a.taskId].push(a.score);
    }

    const taskPlatformAvg: Record<string, number> = {};
    for (const [taskId, scores] of Object.entries(taskScores)) {
      taskPlatformAvg[taskId] = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    }

    const taskMap = new Map(
      tasks.map((t) => [String(t.id), { name: t.name, difficulty: t.difficulty }])
    );

    const matrix: Array<{
      groupId: string;
      groupName: string;
      taskId: string;
      taskName: string;
      studentCount: number;
      attemptedCount: number;
      passedCount: number;
      avgScore: number;
      bestScore: number;
      platformAvg: number;
      delta: number;
      passRate: number;
    }> = [];

    for (const group of groups) {
      const memberIds = membersByGroup[group.id] || new Set<string>();
      if (memberIds.size === 0) continue;

      const taskIds = [...new Set(allAttempts.map((a) => a.taskId))];

      for (const taskId of taskIds) {
        const meta = taskMap.get(taskId);
        let attemptedCount = 0;
        let passedCount = 0;
        let totalScore = 0;
        let bestScore = 0;

        for (const userId of memberIds) {
          const scores = attemptsByUserTask[userId]?.[taskId];
          if (scores && scores.length > 0) {
            attemptedCount++;
            const best = Math.max(...scores);
            totalScore += scores.reduce((s, v) => s + v, 0) / scores.length;
            if (best > bestScore) bestScore = best;
            if (best >= PASS_THRESHOLD) passedCount++;
          }
        }

        if (attemptedCount === 0) continue;

        const avgScore = Math.round(totalScore / attemptedCount);
        const platformAvg = taskPlatformAvg[taskId] || 0;
        const delta = avgScore - platformAvg;
        const passRate = Math.round((passedCount / attemptedCount) * 100);

        matrix.push({
          groupId: group.id,
          groupName: group.name,
          taskId,
          taskName: meta?.name || `Задание ${taskId}`,
          studentCount: memberIds.size,
          attemptedCount,
          passedCount,
          avgScore,
          bestScore,
          platformAvg,
          delta,
          passRate,
        });
      }
    }

    // Summary: per-group stats
    const groupSummary = groups.map((group) => {
      const groupMatrix = matrix.filter((m) => m.groupId === group.id);
      const avgScore = groupMatrix.length > 0
        ? Math.round(groupMatrix.reduce((s, m) => s + m.avgScore, 0) / groupMatrix.length)
        : 0;
      const avgPassRate = groupMatrix.length > 0
        ? Math.round(groupMatrix.reduce((s, m) => s + m.passRate, 0) / groupMatrix.length)
        : 0;
      const avgDelta = groupMatrix.length > 0
        ? Math.round(groupMatrix.reduce((s, m) => s + m.delta, 0) / groupMatrix.length)
        : 0;

      return {
        groupId: group.id,
        groupName: group.name,
        studentCount: membersByGroup[group.id]?.size || 0,
        tasksAttempted: groupMatrix.length,
        avgScore,
        avgPassRate,
        avgDelta,
      };
    }).sort((a, b) => b.avgScore - a.avgScore);

    const result = { matrix: matrix.slice(0, 500), groupSummary };

    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
