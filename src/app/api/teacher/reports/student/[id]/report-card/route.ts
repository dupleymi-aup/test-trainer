import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { logApiError } from "@/lib/api-error-handler";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const { id } = await params;

    // Verify the student belongs to a group managed by this teacher
    const membership = await db.userGroup.findFirst({
      where: {
        userId: id,
        group: { createdByUserId: session.userId },
      },
    });

    // Admins can view any student; teachers can only view students in their groups
    if (!membership && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: student is not in your group" }, { status: 403 });
    }

    const student = await db.user.findUnique({
      where: { id, role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        group: true,
        university: true,
        createdAt: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const attempts = await db.attempt.findMany({
      where: { userId: id },
      orderBy: { createdAt: "asc" },
    });

    // Build task metadata map
    const taskMap = new Map(
      tasks.map((t) => [
        String(t.id),
        { name: t.name, difficulty: t.difficulty, topics: t.topics },
      ])
    );

    // Calculate stats
    const bestScore =
      attempts.reduce((max, a) => Math.max(max, a.score), 0);
    const avgScore =
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
        : 0;
    const avgEc =
      attempts.length > 0
        ? Math.round(
            attempts.reduce((s, a) => s + a.ecCoverage, 0) / attempts.length
          )
        : 0;
    const avgBv =
      attempts.length > 0
        ? Math.round(
            attempts.reduce((s, a) => s + a.bvCoverage, 0) / attempts.length
          )
        : 0;
    const avgCorrectness =
      attempts.length > 0
        ? Math.round(
            attempts.reduce((s, a) => s + a.correctness, 0) / attempts.length
          )
        : 0;
    const avgTimeSpent =
      attempts.length > 0
        ? attempts.reduce((s, a) => s + a.timeSpent, 0) / attempts.length
        : 0;

    // Scores over time
    const scoresOverTime = attempts.map((a) => ({
      date: a.createdAt.toISOString(),
      score: a.score,
      ecCoverage: a.ecCoverage,
      bvCoverage: a.bvCoverage,
    }));

    // Task performance
    const taskAttempts: Record<
      string,
      Array<{
        score: number;
        ecCoverage: number;
        bvCoverage: number;
        createdAt: Date;
      }>
    > = {};
    attempts.forEach((a) => {
      if (!taskAttempts[a.taskId]) taskAttempts[a.taskId] = [];
      taskAttempts[a.taskId].push({
        score: a.score,
        ecCoverage: a.ecCoverage,
        bvCoverage: a.bvCoverage,
        createdAt: a.createdAt,
      });
    });

    const taskPerformance = Object.entries(taskAttempts).map(
      ([taskId, atts]) => {
        const meta = taskMap.get(taskId);
        const bestScore = atts.reduce((max, a) => Math.max(max, a.score), 0);
        const avgEc = Math.round(
          atts.reduce((s, a) => s + a.ecCoverage, 0) / atts.length
        );
        const avgBv = Math.round(
          atts.reduce((s, a) => s + a.bvCoverage, 0) / atts.length
        );

        // Calculate trend
        let trend: "improving" | "stable" | "declining" = "stable";
        if (atts.length >= 4) {
          const firstHalf = atts.slice(0, Math.floor(atts.length / 2));
          const secondHalf = atts.slice(Math.floor(atts.length / 2));
          const firstAvg =
            firstHalf.reduce((s, a) => s + a.score, 0) / firstHalf.length;
          const secondAvg =
            secondHalf.reduce((s, a) => s + a.score, 0) / secondHalf.length;
          const delta = secondAvg - firstAvg;
          if (delta > 10) trend = "improving";
          else if (delta < -10) trend = "declining";
        }

        return {
          taskId,
          taskName: meta?.name || `Задание ${taskId}`,
          bestScore,
          attemptsCount: atts.length,
          avgEc,
          avgBv,
          trend,
        };
      }
    );

    // Topic analysis (weak & strong areas)
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

    const topicPerformance = Object.entries(topicScores)
      .map(([topic, scores]) => ({
        topic,
        avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
        taskCount: new Set(
          attempts
            .filter((a) => taskMap.get(a.taskId)?.topics?.includes(topic))
            .map((a) => a.taskId)
        ).size,
      }))
      .sort((a, b) => a.avgScore - b.avgScore);

    const weakAreas = topicPerformance.filter((t) => t.avgScore < 70).slice(0, 3);
    const strongAreas = topicPerformance
      .filter((t) => t.avgScore >= 70)
      .slice(-3)
      .reverse();

    // Group percentile ranking
    let groupPercentile = 50; // default
    if (student.group) {
      const groupMembers = await db.userGroup.findMany({
        where: { groupId: student.group },
        select: {
          user: {
            select: {
              id: true,
              attempts: {
                select: { score: true },
              },
            },
          },
        },
      });

      const groupBestScores = groupMembers.map((m) => {
        const userAttempts = m.user.attempts;
        return userAttempts.reduce((max, a) => Math.max(max, a.score), 0);
      });

      groupBestScores.sort((a, b) => b - a);
      const studentRank = groupBestScores.findIndex(
        (s) => s <= bestScore
      );
      groupPercentile =
        groupBestScores.length > 0
          ? Math.round(((groupBestScores.length - studentRank) / groupBestScores.length) * 100)
          : 50;
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (weakAreas.length > 0) {
      recommendations.push(
        `Повторить теорию по темам: ${weakAreas.map((a) => a.topic).join(", ")}`
      );
    }
    if (avgEc < 70) {
      recommendations.push(
        "Улучшить покрытие классов эквивалентности — создавать тесты для каждого класса"
      );
    }
    if (avgBv < 70) {
      recommendations.push(
        "Усилить тестирование граничных значений — проверять границы и значения вокруг них"
      );
    }
    if (avgCorrectness < 70) {
      recommendations.push(
        "Повысить корректность тестов — внимательнее проверять ожидаемые результаты"
      );
    }
    if (attempts.length < 5) {
      recommendations.push(
        "Практиковаться больше — выполнить дополнительные задания для закрепления навыков"
      );
    }
    if (recommendations.length === 0) {
      recommendations.push(
        "Отличная работа! Продолжайте практиковаться и помогать другим студентам"
      );
    }

    return NextResponse.json({
      student,
      stats: {
        bestScore,
        avgScore,
        avgEc,
        avgBv,
        avgCorrectness,
        totalAttempts: attempts.length,
        avgTimeSpent: Math.round(avgTimeSpent),
      },
      attempts: attempts.map((a) => ({
        id: a.id,
        taskId: a.taskId,
        score: a.score,
        ecCoverage: a.ecCoverage,
        bvCoverage: a.bvCoverage,
        correctness: a.correctness,
        timeSpent: a.timeSpent,
        createdAt: a.createdAt.toISOString(),
      })),
      scoresOverTime,
      taskPerformance,
      weakAreas,
      strongAreas,
      groupPercentile,
      recommendations,
    });
  } catch (error) {
    logApiError("teacher/reports/report-card", error);
    return NextResponse.json(
      { error: "Failed to generate report card" },
      { status: 500 }
    );
  }
}
