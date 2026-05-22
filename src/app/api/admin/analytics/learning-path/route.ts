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

    const cacheKey = makeCacheKey("learning-path");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const attempts = await db.attempt.findMany({
      select: { userId: true, taskId: true, score: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const taskMap = new Map(tasks.map((t) => [String(t.id), t]));

    // Group attempts by student, ordered by date
    const studentAttempts: Record<string, typeof attempts> = {};
    for (const a of attempts) {
      if (!studentAttempts[a.userId]) studentAttempts[a.userId] = [];
      studentAttempts[a.userId].push(a);
    }

    // Build task sequences per student (unique task order, only students with >= 3 attempts)
    const sequences: string[][] = [];
    const taskScores: Record<string, number[]> = {};

    for (const [userId, userAttempts] of Object.entries(studentAttempts)) {
      if (userAttempts.length < 3) continue;

      // Unique task sequence (first attempt per task)
      const seen = new Set<string>();
      const sequence: string[] = [];
      for (const a of userAttempts) {
        if (!seen.has(a.taskId)) {
          seen.add(a.taskId);
          sequence.push(a.taskId);
        }
        if (!taskScores[a.taskId]) taskScores[a.taskId] = [];
        taskScores[a.taskId].push(a.score);
      }
      sequences.push(sequence);
    }

    // Find most common paths (serialize sequences and count)
    const pathCounts: Record<string, { count: number; scores: number[] }> = {};
    for (const seq of sequences) {
      const key = seq.join(" -> ");
      if (!pathCounts[key]) pathCounts[key] = { count: 0, scores: [] };
      pathCounts[key].count++;
      // Collect avg scores for this path
      const avgScore = seq.reduce((sum, tid) => {
        const scores = taskScores[tid] || [];
        return sum + (scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0);
      }, 0) / seq.length;
      pathCounts[key].scores.push(avgScore);
    }

    const commonPaths = Object.entries(pathCounts)
      .map(([path, data]) => ({
        path: path.split(" -> "),
        count: data.count,
        avgScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Drop-off points: tasks that are last in a student's sequence (student stopped after this)
    const dropoffCounts: Record<string, { count: number; avgScore: number }> = {};
    for (const seq of sequences) {
      const lastTask = seq[seq.length - 1];
      if (!dropoffCounts[lastTask]) {
        const scores = taskScores[lastTask] || [];
        dropoffCounts[lastTask] = {
          count: 0,
          avgScore: scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0,
        };
      }
      dropoffCounts[lastTask].count++;
    }

    const totalStudents = sequences.length;
    const dropoffPoints = Object.entries(dropoffCounts)
      .map(([taskId, data]) => ({
        taskId,
        taskName: taskMap.get(taskId)?.name || taskId,
        dropoffCount: data.count,
        dropoffRate: Math.round((data.count / totalStudents) * 100),
        avgScoreAtDropoff: data.avgScore,
      }))
      .sort((a, b) => b.dropoffCount - a.dropoffCount)
      .slice(0, 10);

    // Task order matrix: for each pair of tasks, how often does A come before B
    const taskOrderMatrix: Record<string, Record<string, number>> = {};
    for (const seq of sequences) {
      for (let i = 0; i < seq.length; i++) {
        for (let j = i + 1; j < seq.length; j++) {
          if (!taskOrderMatrix[seq[i]]) taskOrderMatrix[seq[i]] = {};
          taskOrderMatrix[seq[i]][seq[j]] = (taskOrderMatrix[seq[i]][seq[j]] || 0) + 1;
        }
      }
    }

    const result = { commonPaths, dropoffPoints, taskOrderMatrix, totalStudents: sequences.length };
    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("learning-path analytics failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
