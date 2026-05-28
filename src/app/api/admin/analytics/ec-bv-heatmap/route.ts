import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

  const cacheKey = makeCacheKey("ec-bv-heatmap");
  const cached = getCache(cacheKey);
  if (cached) return NextResponse.json(cached);

  // Build EC/BV metadata from tasks
  const ecMeta: Record<string, { taskId: number; taskName: string; ecName: string; ecId: string; difficulty: string }> = {};
  const bvMeta: Record<string, { taskId: number; taskName: string; bvDesc: string; difficulty: string }> = {};
  const taskEcIds: Record<number, string[]> = {};
  const taskBvDescs: Record<number, string[]> = {};

  tasks.forEach((t) => {
    taskEcIds[t.id] = t.equivalenceClasses.map((ec) => ec.id);
    taskBvDescs[t.id] = t.boundaryValues.map((bv) => bv.description);
    t.equivalenceClasses.forEach((ec) => {
      ecMeta[ec.id] = { taskId: t.id, taskName: t.name, ecName: ec.name, ecId: ec.id, difficulty: t.difficulty };
    });
    t.boundaryValues.forEach((bv, i) => {
      bvMeta[`bv_${t.id}_${i}`] = { taskId: t.id, taskName: t.name, bvDesc: bv.description, difficulty: t.difficulty };
    });
  });

  // Fetch all attempts with EC/BV coverage data
  const attempts = await db.attempt.findMany({
    select: {
      taskId: true,
      ecCoverage: true,
      bvCoverage: true,
      coveredEcIds: true,
      coveredBvDescriptions: true,
      score: true,
    },
  });

  // Analyze EC coverage per task
  const ecAnalysis: Record<string, { covered: number; missed: number; taskName: string; ecName: string; ecId: string; difficulty: string }> = {};
  // Analyze BV coverage per task
  const bvAnalysis: Record<string, { covered: number; missed: number; taskName: string; bvDesc: string; difficulty: string }> = {};

  for (const a of attempts) {
    const taskId = Number(a.taskId);
    const ecIds = taskEcIds[taskId] || [];
    const bvDescs = taskBvDescs[taskId] || [];

    // Parse covered ECs
    let coveredEc: string[] = [];
    try { coveredEc = JSON.parse(a.coveredEcIds || "[]"); } catch { /* invalid JSON treated as empty array */ }

    // Parse covered BVs
    let coveredBv: string[] = [];
    try { coveredBv = JSON.parse(a.coveredBvDescriptions || "[]"); } catch { /* invalid JSON treated as empty array */ }

    // Track EC coverage
    for (const ecId of ecIds) {
      if (!ecAnalysis[ecId]) {
        const meta = ecMeta[ecId];
        ecAnalysis[ecId] = { covered: 0, missed: 0, taskName: meta?.taskName || "", ecName: meta?.ecName || "", ecId, difficulty: meta?.difficulty || "" };
      }
      if (coveredEc.includes(ecId)) {
        ecAnalysis[ecId].covered++;
      } else {
        ecAnalysis[ecId].missed++;
      }
    }

    // Track BV coverage
    for (let i = 0; i < bvDescs.length; i++) {
      const key = `bv_${taskId}_${i}`;
      if (!bvAnalysis[key]) {
        const meta = bvMeta[key];
        bvAnalysis[key] = { covered: 0, missed: 0, taskName: meta?.taskName || "", bvDesc: meta?.bvDesc || "", difficulty: meta?.difficulty || "" };
      }
      if (coveredBv.includes(bvDescs[i])) {
        bvAnalysis[key].covered++;
      } else {
        bvAnalysis[key].missed++;
      }
    }
  }

  // Format results
  const ecHeatmap = Object.values(ecAnalysis)
    .map((e) => ({
      ...e,
      total: e.covered + e.missed,
      missRate: e.covered + e.missed > 0 ? Math.round((e.missed / (e.covered + e.missed)) * 100) : 0,
    }))
    .sort((a, b) => b.missRate - a.missRate);

  const bvHeatmap = Object.values(bvAnalysis)
    .map((b) => ({
      ...b,
      total: b.covered + b.missed,
      missRate: b.covered + b.missed > 0 ? Math.round((b.missed / (b.covered + b.missed)) * 100) : 0,
    }))
    .sort((a, b) => b.missRate - a.missRate);

  // Group by task
  const byTaskEc: Record<string, typeof ecHeatmap> = {};
  const byTaskBv: Record<string, typeof bvHeatmap> = {};
  ecHeatmap.forEach((e) => {
    if (!byTaskEc[e.taskName]) byTaskEc[e.taskName] = [];
    byTaskEc[e.taskName].push(e);
  });
  bvHeatmap.forEach((b) => {
    if (!byTaskBv[b.taskName]) byTaskBv[b.taskName] = [];
    byTaskBv[b.taskName].push(b);
  });

  // Platform-wide summary
  const totalEcAttempts = ecHeatmap.reduce((s, e) => s + e.total, 0);
  const totalEcMissed = ecHeatmap.reduce((s, e) => s + e.missed, 0);
  const totalBvAttempts = bvHeatmap.reduce((s, b) => s + b.total, 0);
  const totalBvMissed = bvHeatmap.reduce((s, b) => s + b.missed, 0);

  const result = {
    ecHeatmap,
    bvHeatmap,
    byTaskEc,
    byTaskBv,
    summary: {
      ecCoverageRate: totalEcAttempts > 0 ? Math.round(((totalEcAttempts - totalEcMissed) / totalEcAttempts) * 100) : 0,
      bvCoverageRate: totalBvAttempts > 0 ? Math.round(((totalBvAttempts - totalBvMissed) / totalBvAttempts) * 100) : 0,
      totalEcTests: ecHeatmap.length,
      totalBvTests: bvHeatmap.length,
      mostMissedEc: ecHeatmap[0] || null,
      mostMissedBv: bvHeatmap[0] || null,
    },
  };
    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("EC-BV heatmap analytics failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
