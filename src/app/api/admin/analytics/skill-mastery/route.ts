import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { logger } from "@/lib/logger";

interface EcSkill {
  ecId: string;
  ecName: string;
  taskId: number;
  taskName: string;
  difficulty: string;
  firstAttempt: string | null;
  lastAttempt: string | null;
  attemptsCount: number;
  avgScore: number;
  coverageRate: number;
  trend: "improving" | "stable" | "declining" | "none";
  scoreProgression: Array<{ date: string; score: number }>;
}

interface BvSkill {
  bvDescription: string;
  taskId: number;
  taskName: string;
  difficulty: string;
  firstAttempt: string | null;
  lastAttempt: string | null;
  attemptsCount: number;
  avgScore: number;
  coverageRate: number;
  trend: "improving" | "stable" | "declining" | "none";
  scoreProgression: Array<{ date: string; score: number }>;
}

export async function GET(request: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");
  const universityFilter = searchParams.get("university");

  // Build student filter
  const studentWhere: Record<string, unknown> = { role: "STUDENT", deletedAt: null };

  if (groupId) {
    const memberIds = await db.userGroup.findMany({
      where: { groupId },
      select: { userId: true },
    });
    studentWhere.id = { in: memberIds.map((m) => m.userId) };
  }
  if (universityFilter) studentWhere.university = universityFilter;

  // Check cache
  const cacheKey = makeCacheKey("skill-mastery", { groupId, universityFilter });
  const cached = getCache(cacheKey);
  if (cached) return NextResponse.json(cached);

  const students = await db.user.findMany({
    where: studentWhere,
    select: { id: true },
  });

  const studentIds = students.map((s) => s.id);

  // Fetch all attempts
  const attempts = await db.attempt.findMany({
    where: { userId: { in: studentIds } },
    select: {
      taskId: true,
      score: true,
      ecCoverage: true,
      bvCoverage: true,
      coveredEcIds: true,
      coveredBvDescriptions: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const taskMap = new Map(
    tasks.map((t) => [t.id, { name: t.name, difficulty: t.difficulty, equivalenceClasses: t.equivalenceClasses, boundaryValues: t.boundaryValues }])
  );

  // EC tracking: ecId -> { scores, dates, coverage flags }
  const ecTracker: Record<string, { scores: number[]; dates: string[]; coveredCount: number; totalAttempts: number; taskId: number }> = {};
  // BV tracking: bvDesc -> { scores, dates, coverage flags }
  const bvTracker: Record<string, { scores: number[]; dates: string[]; coveredCount: number; totalAttempts: number; taskId: number }> = {};

  for (const a of attempts) {
    const taskId = parseInt(a.taskId);
    const task = taskMap.get(taskId);
    if (!task) continue;
    const dateStr = a.createdAt.toISOString().split("T")[0];

    // Parse covered ECs
    let coveredEcIds: string[] = [];
    try { coveredEcIds = JSON.parse(a.coveredEcIds || "[]"); } catch { /* ignore */ }

    // Parse covered BVs
    let coveredBvDescs: string[] = [];
    try { coveredBvDescs = JSON.parse(a.coveredBvDescriptions || "[]"); } catch { /* ignore */ }

    // Track each EC for this task
    for (const ec of task.equivalenceClasses) {
      if (!ecTracker[ec.id]) {
        ecTracker[ec.id] = { scores: [], dates: [], coveredCount: 0, totalAttempts: 0, taskId };
      }
      ecTracker[ec.id].totalAttempts++;
      ecTracker[ec.id].scores.push(a.score);
      ecTracker[ec.id].dates.push(dateStr);
      if (coveredEcIds.includes(ec.id)) {
        ecTracker[ec.id].coveredCount++;
      }
    }

    // Track each BV for this task
    for (const bv of task.boundaryValues) {
      if (!bvTracker[bv.description]) {
        bvTracker[bv.description] = { scores: [], dates: [], coveredCount: 0, totalAttempts: 0, taskId };
      }
      bvTracker[bv.description].totalAttempts++;
      bvTracker[bv.description].scores.push(a.score);
      bvTracker[bv.description].dates.push(dateStr);
      if (coveredBvDescs.includes(bv.description)) {
        bvTracker[bv.description].coveredCount++;
      }
    }
  }

  // Build EC skill list
  const ecSkills: EcSkill[] = [];
  for (const [ecId, data] of Object.entries(ecTracker)) {
    // Find the task and EC name
    const task = taskMap.get(data.taskId);
    const ec = task?.equivalenceClasses.find((e) => e.id === ecId);
    if (!task || !ec) continue;

    const avgScore = Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length);
    const coverageRate = Math.round((data.coveredCount / data.totalAttempts) * 100);

    // Trend: compare first 3 vs last 3
    let trend: "improving" | "stable" | "declining" | "none" = "none";
    if (data.scores.length >= 6) {
      const first3 = data.scores.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
      const last3 = data.scores.slice(-3).reduce((s, v) => s + v, 0) / 3;
      trend = last3 - first3 > 10 ? "improving" : last3 - first3 < -10 ? "declining" : "stable";
    }

    // Score progression: group by date, take avg per date
    const dateScores: Record<string, number[]> = {};
    for (let i = 0; i < data.dates.length; i++) {
      if (!dateScores[data.dates[i]]) dateScores[data.dates[i]] = [];
      dateScores[data.dates[i]].push(data.scores[i]);
    }
    const scoreProgression = Object.entries(dateScores)
      .map(([date, scores]) => ({
        date,
        score: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10); // last 10 data points

    ecSkills.push({
      ecId,
      ecName: ec.name,
      taskId: data.taskId,
      taskName: task.name,
      difficulty: task.difficulty,
      firstAttempt: data.dates[0] || null,
      lastAttempt: data.dates[data.dates.length - 1] || null,
      attemptsCount: data.totalAttempts,
      avgScore,
      coverageRate,
      trend,
      scoreProgression,
    });
  }

  // Build BV skill list
  const bvSkills: BvSkill[] = [];
  for (const [bvDesc, data] of Object.entries(bvTracker)) {
    const task = taskMap.get(data.taskId);
    if (!task) continue;

    const avgScore = Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length);
    const coverageRate = Math.round((data.coveredCount / data.totalAttempts) * 100);

    let trend: "improving" | "stable" | "declining" | "none" = "none";
    if (data.scores.length >= 6) {
      const first3 = data.scores.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
      const last3 = data.scores.slice(-3).reduce((s, v) => s + v, 0) / 3;
      trend = last3 - first3 > 10 ? "improving" : last3 - first3 < -10 ? "declining" : "stable";
    }

    const dateScores: Record<string, number[]> = {};
    for (let i = 0; i < data.dates.length; i++) {
      if (!dateScores[data.dates[i]]) dateScores[data.dates[i]] = [];
      dateScores[data.dates[i]].push(data.scores[i]);
    }
    const scoreProgression = Object.entries(dateScores)
      .map(([date, scores]) => ({
        date,
        score: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10);

    bvSkills.push({
      bvDescription: bvDesc,
      taskId: data.taskId,
      taskName: task.name,
      difficulty: task.difficulty,
      firstAttempt: data.dates[0] || null,
      lastAttempt: data.dates[data.dates.length - 1] || null,
      attemptsCount: data.totalAttempts,
      avgScore,
      coverageRate,
      trend,
      scoreProgression,
    });
  }

  // Sort by coverage rate (lowest first — weakest skills)
  ecSkills.sort((a, b) => a.coverageRate - b.coverageRate);
  bvSkills.sort((a, b) => a.coverageRate - b.coverageRate);

  // Summary
  const totalEcSkills = ecSkills.length;
  const masteredEc = ecSkills.filter((s) => s.coverageRate >= 80).length;
  const weakEc = ecSkills.filter((s) => s.coverageRate < 50).length;
  const totalBvSkills = bvSkills.length;
  const masteredBv = bvSkills.filter((s) => s.coverageRate >= 80).length;
  const weakBv = bvSkills.filter((s) => s.coverageRate < 50).length;

  // Top improving
  const improvingEc = ecSkills.filter((s) => s.trend === "improving").slice(0, 5);
  const decliningEc = ecSkills.filter((s) => s.trend === "declining").slice(0, 5);

  const result = {
    ecSkills: ecSkills.slice(0, 50),
    bvSkills: bvSkills.slice(0, 50),
    summary: {
      totalEcSkills,
      masteredEc,
      weakEc,
      totalBvSkills,
      masteredBv,
      weakBv,
      improvingEc,
      decliningEc,
    },
  };
    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Skill mastery analytics failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
