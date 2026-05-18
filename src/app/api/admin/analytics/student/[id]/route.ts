import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { computeStudentStats, generateRecommendations } from "@/lib/risk-analysis";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  const { id } = await params;

  const student = await db.user.findUnique({
    where: { id, role: "STUDENT" },
    select: {
      id: true, name: true, email: true, phone: true,
      group: true, university: true, createdAt: true, isActive: true,
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const attempts = await db.attempt.findMany({
    where: { userId: id },
    orderBy: { createdAt: "asc" },
  });

  const taskMap = new Map(
    tasks.map((t) => [String(t.id), { name: t.name, difficulty: t.difficulty, topics: t.topics }])
  );

  // Core stats
  const stats = computeStudentStats(attempts.map((a) => ({
    score: a.score, ecCoverage: a.ecCoverage, bvCoverage: a.bvCoverage,
    correctness: a.correctness, timeSpent: a.timeSpent, createdAt: a.createdAt,
  })));

  // Velocity (attempts per day since first attempt)
  const velocity = attempts.length > 1
    ? (() => {
        const first = new Date(attempts[0].createdAt);
        const last = new Date(attempts[attempts.length - 1].createdAt);
        const days = Math.max(1, Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)));
        return Math.round((attempts.length / days) * 10) / 10;
      })()
    : 0;

  // Recent activity
  const now = new Date();
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const attemptsLast7Days = attempts.filter((a) => a.createdAt >= sevenDaysAgo).length;
  const attemptsLast30Days = attempts.filter((a) => a.createdAt >= thirtyDaysAgo).length;

  // Scores over time
  const scoresOverTime = attempts.map((a) => ({
    date: a.createdAt.toISOString(),
    score: a.score,
    ecCoverage: a.ecCoverage,
    bvCoverage: a.bvCoverage,
  }));

  // Task performance with trend
  const taskAttemptsMap: Record<string, Array<{ score: number; ecCoverage: number; bvCoverage: number; timeSpent: number; createdAt: Date }>> = {};
  attempts.forEach((a) => {
    if (!taskAttemptsMap[a.taskId]) taskAttemptsMap[a.taskId] = [];
    taskAttemptsMap[a.taskId].push({
      score: a.score, ecCoverage: a.ecCoverage, bvCoverage: a.bvCoverage,
      timeSpent: a.timeSpent, createdAt: a.createdAt,
    });
  });

  const taskPerformance = Object.entries(taskAttemptsMap).map(([taskId, atts]) => {
    const meta = taskMap.get(taskId);
    const bestScore = Math.max(...atts.map((a) => a.score));
    const avgScore = Math.round(atts.reduce((s, a) => s + a.score, 0) / atts.length);
    const avgEc = Math.round(atts.reduce((s, a) => s + a.ecCoverage, 0) / atts.length);
    const avgBv = Math.round(atts.reduce((s, a) => s + a.bvCoverage, 0) / atts.length);
    const avgTime = Math.round(atts.reduce((s, a) => s + a.timeSpent, 0) / atts.length);

    let trend: "improving" | "stable" | "declining" = "stable";
    if (atts.length >= 4) {
      const mid = Math.floor(atts.length / 2);
      const firstAvg = atts.slice(0, mid).reduce((s, a) => s + a.score, 0) / mid;
      const secondAvg = atts.slice(mid).reduce((s, a) => s + a.score, 0) / (atts.length - mid);
      const delta = secondAvg - firstAvg;
      if (delta > 10) trend = "improving";
      else if (delta < -10) trend = "declining";
    }

    return { taskId, taskName: meta?.name || `Задание ${taskId}`, bestScore, avgScore, attemptsCount: atts.length, avgEc, avgBv, trend, avgTimeSpent: avgTime };
  });

  // Topic analysis
  const topicScores: Record<string, number[]> = {};
  attempts.forEach((a) => {
    const meta = taskMap.get(a.taskId);
    if (meta?.topics) {
      meta.topics.forEach((topic) => {
        if (!topicScores[topic]) topicScores[topic] = [];
        topicScores[topic].push(a.score);
      });
    }
  });

  const topicPerf = Object.entries(topicScores)
    .map(([topic, scores]) => ({
      topic,
      avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      taskCount: new Set(attempts.filter((a) => taskMap.get(a.taskId)?.topics?.includes(topic)).map((a) => a.taskId)).size,
    }))
    .sort((a, b) => a.avgScore - b.avgScore);

  const weakAreas = topicPerf.filter((t) => t.avgScore < 70).slice(0, 3);
  const strongAreas = topicPerf.filter((t) => t.avgScore >= 70).slice(-3).reverse();

  // Group percentile
  let groupPercentile = 50;
  let groupRanking = { rank: 0, totalInGroup: 0 };
  if (student.group) {
    const groupMembers = await db.userGroup.findMany({
      where: { groupId: student.group },
      select: { user: { select: { id: true, attempts: { select: { score: true } } } } },
    });

    const groupBestScores = groupMembers.map((m) => {
      const userAttempts = m.user.attempts;
      return userAttempts.length > 0 ? Math.max(...userAttempts.map((a) => a.score)) : 0;
    });
    groupBestScores.sort((a, b) => b - a);

    const studentRank = groupBestScores.findIndex((s) => s <= stats.bestScore);
    groupPercentile = groupBestScores.length > 0
      ? Math.round(((groupBestScores.length - Math.max(0, studentRank)) / groupBestScores.length) * 100)
      : 50;
    groupRanking = { rank: Math.max(1, studentRank + 1), totalInGroup: groupBestScores.length };
  }

  // Time analysis
  const timePerTask: Record<string, number[]> = {};
  attempts.forEach((a) => {
    if (!timePerTask[a.taskId]) timePerTask[a.taskId] = [];
    timePerTask[a.taskId].push(a.timeSpent);
  });

  const avgTimePerTask = Object.entries(timePerTask).map(([taskId, times]) => ({
    taskId,
    taskName: taskMap.get(taskId)?.name || `Задание ${taskId}`,
    avgTimeSpent: Math.round(times.reduce((s, v) => s + v, 0) / times.length),
  }));

  const totalTimeSpent = attempts.reduce((s, a) => s + a.timeSpent, 0);
  const timeDistribution: Record<string, number> = { "0-60с": 0, "60-300с": 0, "300-600с": 0, "600с+": 0 };
  attempts.forEach((a) => {
    if (a.timeSpent <= 60) timeDistribution["0-60с"]++;
    else if (a.timeSpent <= 300) timeDistribution["60-300с"]++;
    else if (a.timeSpent <= 600) timeDistribution["300-600с"]++;
    else timeDistribution["600с+"]++;
  });

  // Percentile by task
  const percentileByTask = taskPerformance.map((tp) => {
    const allForTask = attempts.filter((a) => a.taskId === tp.taskId);
    const platformBest = Math.max(...allForTask.map((a) => a.score));
    const platformAvg = Math.round(allForTask.reduce((s, a) => s + a.score, 0) / allForTask.length);
    return { taskId: tp.taskId, taskName: tp.taskName, studentBest: tp.bestScore, groupAvg: platformAvg };
  });

  // Recommendations
  const recommendations = generateRecommendations(weakAreas, stats.avgEc, stats.avgBv, stats.avgCorrectness, stats.totalAttempts);

  return NextResponse.json({
    student,
    stats: {
      ...stats,
      velocity,
      attemptsLast7Days,
      attemptsLast30Days,
      firstAttemptDate: attempts.length > 0 ? attempts[0].createdAt.toISOString() : null,
      lastAttemptDate: attempts.length > 0 ? attempts[attempts.length - 1].createdAt.toISOString() : null,
    },
    attempts: attempts.map((a) => ({
      id: a.id, taskId: a.taskId, score: a.score, ecCoverage: a.ecCoverage,
      bvCoverage: a.bvCoverage, correctness: a.correctness, timeSpent: a.timeSpent,
      createdAt: a.createdAt.toISOString(),
    })),
    scoresOverTime,
    taskPerformance,
    weakAreas,
    strongAreas,
    groupPercentile,
    groupRanking,
    timeAnalysis: { avgTimePerTask, totalTimeSpent, timeDistribution },
    recommendations,
    percentileByTask,
  });
}
