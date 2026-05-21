import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

export async function GET() {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  // Check cache
  const cacheKey = makeCacheKey("ec-bv-gaps");
  const cached = getCache(cacheKey);
  if (cached) return NextResponse.json(cached);

  const attempts = await db.attempt.findMany({
    select: { userId: true, taskId: true, score: true, coveredEcIds: true, coveredBvDescriptions: true },
  });

  const taskMap = new Map(tasks.map((t) => [String(t.id), t]));

  // Per-task EC/BV tracking
  interface EcStat { ecId: string; ecName: string; covered: number; total: number }
  interface BvStat { bvDesc: string; covered: number; total: number }

  const taskGaps: Record<string, { taskName: string; ecStats: EcStat[]; bvStats: BvStat[] }> = {};

  // Track which ECs/BVs we've seen per task
  const taskEcMap: Record<string, Map<string, { covered: number; total: number; name: string }>> = {};
  const taskBvMap: Record<string, Map<string, { covered: number; total: number }>> = {};

  for (const a of attempts) {
    const task = taskMap.get(a.taskId);
    if (!task) continue;

    if (!taskEcMap[a.taskId]) {
      taskEcMap[a.taskId] = new Map();
      for (const ec of task.equivalenceClasses) {
        taskEcMap[a.taskId].set(ec.id, { covered: 0, total: 0, name: ec.name });
      }
    }
    if (!taskBvMap[a.taskId]) {
      taskBvMap[a.taskId] = new Map();
      for (const bv of task.boundaryValues) {
        taskBvMap[a.taskId].set(bv.description, { covered: 0, total: 0 });
      }
    }

    // Parse covered ECs
    let coveredEcIds: string[] = [];
    try { coveredEcIds = JSON.parse(a.coveredEcIds || "[]"); } catch { /* skip */ }

    let coveredBvDescriptions: string[] = [];
    try { coveredBvDescriptions = JSON.parse(a.coveredBvDescriptions || "[]"); } catch { /* skip */ }

    // Increment totals for all ECs/BVs of this task
    for (const ec of task.equivalenceClasses) {
      const stat = taskEcMap[a.taskId].get(ec.id);
      if (stat) {
        stat.total++;
        if (coveredEcIds.includes(ec.id)) stat.covered++;
      }
    }
    for (const bv of task.boundaryValues) {
      const stat = taskBvMap[a.taskId].get(bv.description);
      if (stat) {
        stat.total++;
        if (coveredBvDescriptions.includes(bv.description)) stat.covered++;
      }
    }
  }

  // Build results
  const allEcStats: { taskId: string; taskName: string; ecId: string; ecName: string; missRate: number }[] = [];
  const allBvStats: { taskId: string; taskName: string; bvDesc: string; missRate: number }[] = [];

  for (const [taskId, ecMap] of Object.entries(taskEcMap)) {
    const task = taskMap.get(taskId);
    const taskName = task?.name || taskId;
    for (const [ecId, stat] of ecMap) {
      if (stat.total > 0) {
        const missRate = Math.round(((stat.total - stat.covered) / stat.total) * 100);
        allEcStats.push({ taskId, taskName, ecId, ecName: stat.name, missRate });
      }
    }
  }

  for (const [taskId, bvMap] of Object.entries(taskBvMap)) {
    const task = taskMap.get(taskId);
    const taskName = task?.name || taskId;
    for (const [bvDesc, stat] of bvMap) {
      if (stat.total > 0) {
        const missRate = Math.round(((stat.total - stat.covered) / stat.total) * 100);
        allBvStats.push({ taskId, taskName, bvDesc, missRate });
      }
    }
  }

  // Top worst ECs and BVs platform-wide
  const worstECs = allEcStats.sort((a, b) => b.missRate - a.missRate).slice(0, 10);
  const worstBVs = allBvStats.sort((a, b) => b.missRate - a.missRate).slice(0, 10);

  // Per-task worst ECs/BVs
  const taskResults: { taskId: string; taskName: string; weakestECs: typeof worstECs; weakestBVs: typeof worstBVs }[] = [];
  const taskIds = [...new Set([...allEcStats.map((e) => e.taskId), ...allBvStats.map((b) => b.taskId)])];

  for (const taskId of taskIds) {
    const task = taskMap.get(taskId);
    const taskECs = allEcStats.filter((e) => e.taskId === taskId).sort((a, b) => b.missRate - a.missRate).slice(0, 5);
    const taskBVs = allBvStats.filter((b) => b.taskId === taskId).sort((a, b) => b.missRate - a.missRate).slice(0, 5);
    if (taskECs.length > 0 || taskBVs.length > 0) {
      taskResults.push({ taskId, taskName: task?.name || taskId, weakestECs: taskECs, weakestBVs: taskBVs });
    }
  }

  const result = { taskGaps: taskResults, worstECs, worstBVs };
  setCache(cacheKey, result, DEFAULT_TTL.expensive);
  return NextResponse.json(result);
}
