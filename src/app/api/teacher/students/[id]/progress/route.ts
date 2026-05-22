import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { logger } from "@/lib/logger";

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
        phone: true,
        university: true,
        group: true,
        createdAt: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const attempts = await db.attempt.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Parse testCases from JSON for each attempt
    const parsedAttempts = attempts.map((a) => ({
      ...a,
      testCases: JSON.parse(a.testCases),
      coveredEcIds: JSON.parse(a.coveredEcIds),
      coveredBvDescriptions: JSON.parse(a.coveredBvDescriptions),
    }));

    // Compute stats
    const bestScore = attempts.reduce((max, a) => Math.max(max, a.score), 0);
    const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0;
    const avgEc = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.ecCoverage, 0) / attempts.length) : 0;
    const avgBv = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.bvCoverage, 0) / attempts.length) : 0;

    // Scores over time
    const scoresOverTime = attempts
      .slice()
      .reverse()
      .map((a) => ({
        date: a.createdAt.toISOString(),
        score: a.score,
        ecCoverage: a.ecCoverage,
        bvCoverage: a.bvCoverage,
      }));

    // Task breakdown
    const taskMap = new Map(
      tasks.map((t) => [String(t.id), { name: t.name, topics: t.topics }])
    );

    const taskAttempts: Record<string, Array<{ score: number; ecCoverage: number; bvCoverage: number }>> = {};
    attempts.forEach((a) => {
      if (!taskAttempts[a.taskId]) taskAttempts[a.taskId] = [];
      taskAttempts[a.taskId].push({
        score: a.score,
        ecCoverage: a.ecCoverage,
        bvCoverage: a.bvCoverage,
      });
    });

    const taskBreakdown = Object.entries(taskAttempts).map(([taskId, atts]) => {
      const meta = taskMap.get(taskId);
      return {
        taskId,
        taskName: meta?.name || `Задание ${taskId}`,
        bestScore: atts.reduce((max, a) => Math.max(max, a.score), 0),
        attemptsCount: atts.length,
        avgEc: Math.round(atts.reduce((s, a) => s + a.ecCoverage, 0) / atts.length),
        avgBv: Math.round(atts.reduce((s, a) => s + a.bvCoverage, 0) / atts.length),
      };
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

    const topicPerformance = Object.entries(topicScores)
      .map(([topic, scores]) => ({
        topic,
        avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      }))
      .sort((a, b) => a.avgScore - b.avgScore);

    const weakAreas = topicPerformance.filter((t) => t.avgScore < 70).slice(0, 3);
    const strongAreas = topicPerformance.filter((t) => t.avgScore >= 70).slice(-3).reverse();

    return NextResponse.json({
      student,
      stats: { bestScore, avgScore, avgEc, avgBv, totalAttempts: attempts.length },
      attempts: parsedAttempts,
      scoresOverTime,
      taskBreakdown,
      weakAreas,
      strongAreas,
    });
  } catch (error) {
    logger.error("Failed to fetch student progress", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch student progress" }, { status: 500 });
  }
}
