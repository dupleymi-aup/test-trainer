import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { computeStudentStats, computeStudentRisk } from "@/lib/risk-analysis";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

interface TaskRecommendation {
  taskId: number;
  taskName: string;
  difficulty: string;
  reason: string;
  priority: "high" | "medium" | "low";
  topics: string[];
  matchingGaps: string[];
}

interface StudentRecommendation {
  studentId: string;
  name: string;
  email: string;
  group: string | null;
  university: string | null;
  avgScore: number;
  trend: "improving" | "stable" | "declining";
  dropoutRisk: "high" | "medium" | "low";
  recommendations: TaskRecommendation[];
  totalGaps: number;
}

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");
  const universityFilter = searchParams.get("university");
  const riskLevel = searchParams.get("riskLevel");
  const limit = parseInt(searchParams.get("limit") || "50");

  // Check cache
  const cacheKey = makeCacheKey("recommendations", { groupId, universityFilter, riskLevel, limit });
  const cached = getCache(cacheKey);
  if (cached) return NextResponse.json(cached);

  // Build student filter
  const studentWhere: Record<string, unknown> = { role: "STUDENT", deletedAt: null };

  if (groupId) {
    const memberIds = await db.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    studentWhere.id = { in: memberIds.map((m) => m.userId) };
  }
  if (universityFilter) studentWhere.university = universityFilter;

  const students = await db.user.findMany({
    where: studentWhere,
    select: {
      id: true,
      name: true,
      email: true,
      group: true,
      university: true,
      createdAt: true,
      attempts: {
        select: {
          taskId: true,
          score: true,
          ecCoverage: true,
          bvCoverage: true,
          correctness: true,
          timeSpent: true,
          coveredEcIds: true,
          coveredBvDescriptions: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const taskMap = new Map(
    tasks.map((t) => [
      t.id,
      {
        name: t.name,
        difficulty: t.difficulty,
        topics: t.topics,
        equivalenceClasses: t.equivalenceClasses,
        boundaryValues: t.boundaryValues,
      },
    ])
  );

  const results: StudentRecommendation[] = [];

  for (const student of students) {
    const attempts = student.attempts;
    if (attempts.length === 0) continue;

    const stats = computeStudentStats(attempts);
    const risk = computeStudentRisk(attempts, student.createdAt);

    // Filter by risk level if specified
    if (riskLevel && risk.dropoutRisk !== riskLevel) continue;

    // Determine weak areas
    const taskScores: Record<string, number[]> = {};
    const taskEcCoverage: Record<string, number[]> = {};
    const taskBvCoverage: Record<string, number[]> = {};
    const topicScores: Record<string, number[]> = {};
    const allCoveredEcs = new Set<string>();
    const allCoveredBvs = new Set<string>();

    for (const a of attempts) {
      const tid = parseInt(a.taskId);
      if (!taskScores[tid]) {
        taskScores[tid] = [];
        taskEcCoverage[tid] = [];
        taskBvCoverage[tid] = [];
      }
      taskScores[tid].push(a.score);
      taskEcCoverage[tid].push(a.ecCoverage);
      taskBvCoverage[tid].push(a.bvCoverage);

      // Parse covered ECs/BVs
      try {
        const ecIds = JSON.parse(a.coveredEcIds) as string[];
        ecIds.forEach((id) => allCoveredEcs.add(id));
      } catch {
        // ignore
      }
      try {
        const bvDescs = JSON.parse(a.coveredBvDescriptions) as string[];
        bvDescs.forEach((d) => allCoveredBvs.add(d));
      } catch {
        // ignore
      }

      // Topic scores
      const meta = taskMap.get(tid);
      if (meta) {
        for (const topic of meta.topics) {
          if (!topicScores[topic]) topicScores[topic] = [];
          topicScores[topic].push(a.score);
        }
      }
    }

    // Find weak tasks (avg score < 60)
    const weakTasks = Object.entries(taskScores)
      .map(([tid, scores]) => ({
        taskId: parseInt(tid),
        avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
        avgEc: Math.round(taskEcCoverage[tid].reduce((s, v) => s + v, 0) / scores.length),
        avgBv: Math.round(taskBvCoverage[tid].reduce((s, v) => s + v, 0) / scores.length),
      }))
      .filter((t) => t.avgScore < 60);

    // Find weak topics (avg score < 60)
    const weakTopics = Object.entries(topicScores)
      .map(([topic, scores]) => ({
        topic,
        avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      }))
      .filter((t) => t.avgScore < 60);

    // Find uncovered ECs and BVs across all tasks
    const allEcs = new Set<string>();
    const allBvs = new Set<string>();
    for (const [, meta] of taskMap) {
      meta.equivalenceClasses.forEach((ec) => allEcs.add(ec.id));
      meta.boundaryValues.forEach((bv) => allBvs.add(bv.description));
    }
    const uncoveredEcs = [...allEcs].filter((id) => !allCoveredEcs.has(id));
    const uncoveredBvs = [...allBvs].filter((desc) => !allCoveredBvs.has(desc));

    // Generate task recommendations
    const recommendations: TaskRecommendation[] = [];

    // 1. Recommend tasks for weak topics (priority: high)
    for (const wt of weakTopics.slice(0, 3)) {
      for (const [tid, meta] of taskMap) {
        if (meta.topics.includes(wt.topic) && !taskScores[tid]) {
          const alreadyRecommended = recommendations.find((r) => r.taskId === tid);
          if (!alreadyRecommended) {
            recommendations.push({
              taskId: tid,
              taskName: meta.name,
              difficulty: meta.difficulty,
              reason: `Низкий средний балл по теме "${wt.topic}" (${wt.avgScore}%)`,
              priority: "high",
              topics: meta.topics,
              matchingGaps: [`Тема: ${wt.topic}`],
            });
          }
        }
      }
    }

    // 2. Recommend tasks covering uncovered ECs (priority: medium)
    for (const ecId of uncoveredEcs.slice(0, 5)) {
      for (const [tid, meta] of taskMap) {
        const ec = meta.equivalenceClasses.find((e) => e.id === ecId);
        if (ec && !taskScores[tid]) {
          const alreadyRecommended = recommendations.find((r) => r.taskId === tid);
          if (!alreadyRecommended) {
            recommendations.push({
              taskId: tid,
              taskName: meta.name,
              difficulty: meta.difficulty,
              reason: `Не покрыт класс эквивалентности: ${ec.name}`,
              priority: "medium",
              topics: meta.topics,
              matchingGaps: [`EC: ${ec.name}`],
            });
          }
        }
      }
    }

    // 3. Recommend tasks for weak tasks retry (if avgEc or avgBv < 50)
    for (const wt of weakTasks) {
      const meta = taskMap.get(wt.taskId);
      if (!meta) continue;
      if (wt.avgEc < 50 || wt.avgBv < 50) {
        const gaps: string[] = [];
        if (wt.avgEc < 50) gaps.push(`EC покрытие ${wt.avgEc}%`);
        if (wt.avgBv < 50) gaps.push(`BV покрытие ${wt.avgBv}%`);
        const alreadyRecommended = recommendations.find((r) => r.taskId === wt.taskId);
        if (!alreadyRecommended) {
          recommendations.push({
            taskId: wt.taskId,
            taskName: meta.name,
            difficulty: meta.difficulty,
            reason: `Повторить задание — слабое покрытие тестов (${gaps.join(", ")})`,
            priority: "high",
            topics: meta.topics,
            matchingGaps: gaps,
          });
        }
      }
    }

    // 4. Recommend foundational tasks if avgScore < 40 (start with easy)
    if (stats.avgScore < 40) {
      for (const [tid, meta] of taskMap) {
        if (meta.difficulty === "Легко" && !taskScores[tid]) {
          const alreadyRecommended = recommendations.find((r) => r.taskId === tid);
          if (!alreadyRecommended) {
            recommendations.push({
              taskId: tid,
              taskName: meta.name,
              difficulty: meta.difficulty,
              reason: "Рекомендуется начать с заданий базового уровня",
              priority: "low",
              topics: meta.topics,
              matchingGaps: ["Низкий общий балл"],
            });
          }
        }
      }
    }

    // Deduplicate and sort by priority
    const seen = new Set<number>();
    const deduped = recommendations.filter((r) => {
      if (seen.has(r.taskId)) return false;
      seen.add(r.taskId);
      return true;
    });
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    deduped.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const totalGaps = uncoveredEcs.length + uncoveredBvs.length + weakTopics.length;

    results.push({
      studentId: student.id,
      name: student.name || student.email,
      email: student.email || "",
      group: student.group,
      university: student.university,
      avgScore: stats.avgScore,
      trend: risk.trend,
      dropoutRisk: risk.dropoutRisk,
      recommendations: deduped.slice(0, 8),
      totalGaps,
    });
  }

  // Sort by totalGaps descending (most gaps first)
  results.sort((a, b) => b.totalGaps - a.totalGaps);

  // Apply limit
  const limited = results.slice(0, limit);

  // Platform-wide summary
  const totalStudents = students.length;
  const withRecommendations = results.length;
  const avgRecommendationsPerStudent =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.recommendations.length, 0) / results.length * 10) / 10
      : 0;

  // Most recommended tasks
  const taskRecCount: Record<string, { taskId: number; taskName: string; count: number }> = {};
  for (const r of results) {
    for (const rec of r.recommendations) {
      if (!taskRecCount[rec.taskId]) {
        taskRecCount[rec.taskId] = { taskId: rec.taskId, taskName: rec.taskName, count: 0 };
      }
      taskRecCount[rec.taskId].count++;
    }
  }
  const topRecommendedTasks = Object.values(taskRecCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Most common gaps
  const gapCount: Record<string, number> = {};
  for (const r of results) {
    for (const rec of r.recommendations) {
      for (const gap of rec.matchingGaps) {
        gapCount[gap] = (gapCount[gap] || 0) + 1;
      }
    }
  }
  const topGaps = Object.entries(gapCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([gap, count]) => ({ gap, count }));

  const result = {
    students: limited,
    summary: {
      totalStudents,
      withRecommendations,
      avgRecommendationsPerStudent,
      topRecommendedTasks,
      topGaps,
    },
  };
  setCache(cacheKey, result, DEFAULT_TTL.expensive);
  return NextResponse.json(result);
}
