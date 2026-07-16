import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    unwrapGuard(await requireAdmin());

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Check cache
    const cacheKey = makeCacheKey("topic-heatmap", { startDate, endDate });
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Build task-to-topics map
    const taskTopics = new Map<number, string[]>();
    tasks.forEach((t) => taskTopics.set(t.id, t.topics));

    // Get all unique topics
    const allTopics = [...new Set(tasks.flatMap((t) => t.topics))].sort();

    // Get all groups
    const groups = await db.group.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // Fetch all attempts with user group info
    const attempts = await db.attempt.findMany({
      where: {
        createdAt: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      select: {
        taskId: true,
        score: true,
        ecCoverage: true,
        bvCoverage: true,
        correctness: true,
        user: { select: { group: true } },
      },
    });

    // Build heatmap data: topic x group -> { avgScore, avgEc, avgBv, attemptCount }
    const heatmapData: Record<string, Record<string, { scores: number[]; ecs: number[]; bvs: number[]; count: number }>> = {};
    const groupTaskMastery: Record<string, Record<string, { scores: number[]; count: number }>> = {};

    // Initialize group-level task mastery
    groups.forEach((g) => {
      groupTaskMastery[g.id] = {};
      tasks.forEach((t) => {
        groupTaskMastery[g.id][String(t.id)] = { scores: [], count: 0 };
      });
    });

    for (const a of attempts) {
      const groupName = a.user?.group || "Без группы";
      const topics = taskTopics.get(Number(a.taskId)) || [];

      // Group task mastery
      if (!groupTaskMastery[a.user?.group || ""]) {
        groupTaskMastery[a.user?.group || ""] = {};
      }
      const tid = String(a.taskId);
      if (!groupTaskMastery[a.user?.group || ""][tid]) {
        groupTaskMastery[a.user?.group || ""][tid] = { scores: [], count: 0 };
      }
      groupTaskMastery[a.user?.group || ""][tid].scores.push(a.score);
      groupTaskMastery[a.user?.group || ""][tid].count++;

      // Topic heatmap
      for (const topic of topics) {
        if (!heatmapData[topic]) heatmapData[topic] = {};
        if (!heatmapData[topic][groupName]) {
          heatmapData[topic][groupName] = { scores: [], ecs: [], bvs: [], count: 0 };
        }
        heatmapData[topic][groupName].scores.push(a.score);
        heatmapData[topic][groupName].ecs.push(a.ecCoverage);
        heatmapData[topic][groupName].bvs.push(a.bvCoverage);
        heatmapData[topic][groupName].count++;
      }
    }

    // Aggregate to averages
    const matrix = allTopics.map((topic) => {
      const row: Record<string, { avgScore: number; avgEc: number; avgBv: number; count: number }> = {};
      const groupData = heatmapData[topic] || {};
      groups.forEach((g) => {
        const d = groupData[g.name] || { scores: [], ecs: [], bvs: [], count: 0 };
        row[g.name] = {
          avgScore: d.scores.length > 0 ? Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length) : 0,
          avgEc: d.ecs.length > 0 ? Math.round(d.ecs.reduce((s, v) => s + v, 0) / d.ecs.length) : 0,
          avgBv: d.bvs.length > 0 ? Math.round(d.bvs.reduce((s, v) => s + v, 0) / d.bvs.length) : 0,
          count: d.count,
        };
      });
      return { topic, groups: row };
    });

    // Group task mastery aggregated
    const groupMastery = groups.map((g) => ({
      groupId: g.id,
      groupName: g.name,
      tasks: tasks.map((t) => {
        const d = groupTaskMastery[g.id]?.[String(t.id)] || { scores: [], count: 0 };
        return {
          taskId: t.id,
          taskName: t.name,
          difficulty: t.difficulty,
          avgScore: d.scores.length > 0 ? Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length) : 0,
          count: d.count,
        };
      }),
    }));

    // Topic summary (platform-wide)
    const topicSummary = allTopics.map((topic) => {
      const allScores: number[] = [];
      const allEcs: number[] = [];
      const allBvs: number[] = [];
      Object.values(heatmapData[topic] || {}).forEach((d) => {
        allScores.push(...d.scores);
        allEcs.push(...d.ecs);
        allBvs.push(...d.bvs);
      });
      return {
        topic,
        avgScore: allScores.length > 0 ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length) : 0,
        avgEc: allEcs.length > 0 ? Math.round(allEcs.reduce((s, v) => s + v, 0) / allEcs.length) : 0,
        avgBv: allBvs.length > 0 ? Math.round(allBvs.reduce((s, v) => s + v, 0) / allBvs.length) : 0,
        totalAttempts: allScores.length,
      };
    }).sort((a, b) => a.avgScore - b.avgScore);

    const result = {
      matrix,
      groupMastery,
      topicSummary,
      allTopics,
      groupNames: groups.map((g) => g.name),
    };
    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
