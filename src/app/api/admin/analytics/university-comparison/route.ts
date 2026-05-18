import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";

export async function GET() {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  // Get all students with university field
  const students = await db.user.findMany({
    where: { role: "STUDENT", deletedAt: null, university: { not: "" } },
    select: { id: true, university: true },
  });

  const userIdToUniversity = new Map(students.map((s) => [s.id, s.university]));

  // Get all attempts
  const attempts = await db.attempt.findMany({
    select: {
      userId: true,
      taskId: true,
      score: true,
      ecCoverage: true,
      bvCoverage: true,
      createdAt: true,
    },
  });

  // Aggregate by university
  const universityMap: Record<
    string,
    {
      scores: number[];
      ecs: number[];
      bvs: number[];
      students: Set<string>;
      taskScores: Record<string, number[]>;
      monthlyScores: Record<string, number[]>;
    }
  > = {};

  attempts.forEach((a) => {
    const uni = userIdToUniversity.get(a.userId);
    if (!uni) return;

    if (!universityMap[uni]) {
      universityMap[uni] = {
        scores: [],
        ecs: [],
        bvs: [],
        students: new Set(),
        taskScores: {},
        monthlyScores: {},
      };
    }

    universityMap[uni].scores.push(a.score);
    universityMap[uni].ecs.push(a.ecCoverage);
    universityMap[uni].bvs.push(a.bvCoverage);
    universityMap[uni].students.add(a.userId);

    if (!universityMap[uni].taskScores[a.taskId]) {
      universityMap[uni].taskScores[a.taskId] = [];
    }
    universityMap[uni].taskScores[a.taskId].push(a.score);

    const month = a.createdAt.toISOString().slice(0, 7);
    if (!universityMap[uni].monthlyScores[month]) {
      universityMap[uni].monthlyScores[month] = [];
    }
    universityMap[uni].monthlyScores[month].push(a.score);
  });

  const taskMap = new Map(
    tasks.map((t) => [String(t.id), { name: t.name, topics: t.tasks }])
  );

  const universityComparison = Object.entries(universityMap)
    .map(([name, data]) => {
      // Top tasks
      const topTasks = Object.entries(data.taskScores)
        .map(([taskId, scores]) => ({
          taskId,
          taskName: taskMap.get(taskId)?.name || `Задание ${taskId}`,
          avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
          attemptsCount: scores.length,
        }))
        .sort((a, b) => b.attemptsCount - a.attemptsCount)
        .slice(0, 5);

      // Trend calculation (last 3 months vs previous 3 months)
      const months = Object.keys(data.monthlyScores).sort();
      let trend: "improving" | "stable" | "declining" = "stable";
      if (months.length >= 6) {
        const last3 = months.slice(-3);
        const prev3 = months.slice(-6, -3);
        const last3Avg = last3.reduce(
          (s, m) => s + data.monthlyScores[m].reduce((ss, v) => ss + v, 0) / data.monthlyScores[m].length,
          0
        ) / 3;
        const prev3Avg = prev3.reduce(
          (s, m) => s + data.monthlyScores[m].reduce((ss, v) => ss + v, 0) / data.monthlyScores[m].length,
          0
        ) / 3;
        trend = last3Avg - prev3Avg > 5 ? "improving" : last3Avg - prev3Avg < -5 ? "declining" : "stable";
      }

      return {
        university: name,
        studentCount: data.students.size,
        avgScore: data.scores.length > 0
          ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length)
          : 0,
        avgEc: data.ecs.length > 0
          ? Math.round(data.ecs.reduce((s, v) => s + v, 0) / data.ecs.length)
          : 0,
        avgBv: data.bvs.length > 0
          ? Math.round(data.bvs.reduce((s, v) => s + v, 0) / data.bvs.length)
          : 0,
        totalAttempts: data.scores.length,
        topTasks,
        trend,
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  return NextResponse.json({ universities: universityComparison });
}
