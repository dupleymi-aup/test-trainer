import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";

const riskFactorLabels: Record<string, { label: string; recommendation: string }> = {
  low_performer: {
    label: "Низкая успеваемость",
    recommendation: "Рекомендуется дополнительная практика и консультация с преподавателем",
  },
  declining: {
    label: "Снижение прогресса",
    recommendation: "Необходимо выявить причины снижения и скорректировать учебный план",
  },
  inactive: {
    label: "Длительная неактивность",
    recommendation: "Связаться со студентом для выяснения причин отсутствия",
  },
  low_engagement: {
    label: "Низкая вовлечённость",
    recommendation: "Мотивировать студента к регулярным занятиям",
  },
  poor_ec_coverage: {
    label: "Плохое покрытие классов эквивалентности",
    recommendation: "Изучить тему классов эквивалентности и пройти дополнительные задания",
  },
  poor_bv_coverage: {
    label: "Плохое покрытие граничных значений",
    recommendation: "Обратить внимание на тестирование граничных значений",
  },
};

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const groupId = searchParams.get("groupId");
  const universityFilter = searchParams.get("university");

  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // If groupId is provided, get student IDs from that group
  let userIdFilter: Set<string> | null = null;
  if (groupId) {
    const groupMembers = await db.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    userIdFilter = new Set(groupMembers.map((m) => m.userId));
  }

  // Build student filter
  const studentWhere: Record<string, unknown> = { role: "STUDENT", deletedAt: null };
  if (userIdFilter) studentWhere.id = { in: [...userIdFilter] };
  if (universityFilter) studentWhere.university = universityFilter;

  // Get all students with filters
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
        where: (() => {
          const attemptWhere: Record<string, unknown> = {};
          if (dateFrom || dateTo) {
            const dateCond: Record<string, Date> = {};
            if (dateFrom) dateCond.gte = new Date(dateFrom);
            if (dateTo) dateCond.lte = new Date(dateTo);
            attemptWhere.createdAt = dateCond;
          }
          return Object.keys(attemptWhere).length > 0 ? attemptWhere : undefined;
        })(),
        select: {
          score: true,
          ecCoverage: true,
          bvCoverage: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const atRiskStudents: Array<{
    student: { id: string; name: string; email: string; group: string; university: string };
    riskFactors: string[];
    stats: {
      bestScore: number;
      avgScore: number;
      avgEc: number;
      avgBv: number;
      lastAttemptDate: string | null;
      attemptsCount: number;
      trend: "improving" | "stable" | "declining";
    };
    recommendations: string[];
    dropoutRisk: "high" | "medium" | "low";
  }> = [];

  for (const student of students) {
    const attempts = student.attempts;
    if (attempts.length === 0) continue;

    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    const bestScore = Math.max(...attempts.map((a) => a.score));
    const avgScore = Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length);
    const avgEc = Math.round(attempts.reduce((s, a) => s + a.ecCoverage, 0) / attempts.length);
    const avgBv = Math.round(attempts.reduce((s, a) => s + a.bvCoverage, 0) / attempts.length);
    const lastAttempt = attempts[attempts.length - 1];
    const lastAttemptDate = lastAttempt?.createdAt.toISOString() || null;

    // Trend calculation
    const first3 = attempts.slice(0, 3);
    const last3 = attempts.slice(-3);
    const first3Avg = first3.reduce((s, a) => s + a.score, 0) / first3.length;
    const last3Avg = last3.reduce((s, a) => s + a.score, 0) / last3.length;
    const trend =
      attempts.length >= 6
        ? last3Avg - first3Avg > 15
          ? "improving"
          : last3Avg - first3Avg < -15
            ? "declining"
            : "stable"
        : "stable";

    // Risk factor detection
    if (bestScore < 50) {
      riskFactors.push("low_performer");
      recommendations.push(riskFactorLabels.low_performer.recommendation);
    }

    if (trend === "declining") {
      riskFactors.push("declining");
      recommendations.push(riskFactorLabels.declining.recommendation);
    }

    if (new Date(lastAttemptDate!) < fourteenDaysAgo) {
      riskFactors.push("inactive");
      recommendations.push(riskFactorLabels.inactive.recommendation);
    }

    if (attempts.length < 3 && student.createdAt < sevenDaysAgo) {
      riskFactors.push("low_engagement");
      recommendations.push(riskFactorLabels.low_engagement.recommendation);
    }

    if (avgEc < 50) {
      riskFactors.push("poor_ec_coverage");
      recommendations.push(riskFactorLabels.poor_ec_coverage.recommendation);
    }

    if (avgBv < 50) {
      riskFactors.push("poor_bv_coverage");
      recommendations.push(riskFactorLabels.poor_bv_coverage.recommendation);
    }

    if (riskFactors.length === 0) continue;

    // Dropout risk calculation
    const riskScore = riskFactors.length + (trend === "declining" ? 1 : 0) + (bestScore < 30 ? 1 : 0);
    const dropoutRisk: "high" | "medium" | "low" =
      riskScore >= 4 ? "high" : riskScore >= 2 ? "medium" : "low";

    atRiskStudents.push({
      student: {
        id: student.id,
        name: student.name || student.email || "Unknown",
        email: student.email || "",
        group: student.group || "",
        university: student.university || "",
      },
      riskFactors,
      stats: {
        bestScore,
        avgScore,
        avgEc,
        avgBv,
        lastAttemptDate,
        attemptsCount: attempts.length,
        trend,
      },
      recommendations,
      dropoutRisk,
    });
  }

  // Sort by risk factors count (most at-risk first)
  atRiskStudents.sort((a, b) => b.riskFactors.length - a.riskFactors.length);

  // System-level insights
  const allAttempts = await db.attempt.findMany({
    select: { taskId: true, score: true },
  });

  const taskMap = new Map(
    tasks.map((t) => [String(t.id), { name: t.name, topics: t.topics }])
  );

  const taskScores: Record<string, number[]> = {};
  allAttempts.forEach((a) => {
    if (!taskScores[a.taskId]) taskScores[a.taskId] = [];
    taskScores[a.taskId].push(a.score);
  });

  const tasksByFailRate = Object.entries(taskScores)
    .map(([taskId, scores]) => ({
      taskId,
      taskName: taskMap.get(taskId)?.name || `Задание ${taskId}`,
      failRate: Math.round((scores.filter((s) => s < 50).length / scores.length) * 100),
      avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      topics: taskMap.get(taskId)?.topics || [],
    }))
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, 5);

  const topicsNeedingAttention: Record<string, { scores: number[] }> = {};
  allAttempts.forEach((a) => {
    const meta = taskMap.get(a.taskId);
    if (!meta) return;
    meta.topics.forEach((topic) => {
      if (!topicsNeedingAttention[topic]) topicsNeedingAttention[topic] = { scores: [] };
      topicsNeedingAttention[topic].scores.push(a.score);
    });
  });

  const weakTopics = Object.entries(topicsNeedingAttention)
    .map(([topic, data]) => ({
      topic,
      avgScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
    }))
    .filter((t) => t.avgScore < 60)
    .sort((a, b) => a.avgScore - b.avgScore);

  // Group-level recommendations
  const groups = await db.group.findMany({
    select: {
      id: true,
      name: true,
      members: {
        select: {
          user: {
            select: {
              id: true,
              attempts: { select: { score: true } },
            },
          },
        },
      },
    },
  });

  const groupRecommendations = groups
    .map((g) => {
      const allScores = g.members.flatMap((m) => m.user.attempts.map((a) => a.score));
      const avgScore = allScores.length > 0
        ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length)
        : 0;
      const atRiskCount = g.members.filter((m) =>
        m.user.attempts.length > 0 &&
        Math.max(...m.user.attempts.map((a) => a.score)) < 50
      ).length;

      return {
        groupId: g.id,
        groupName: g.name,
        avgScore,
        atRiskStudents: atRiskCount,
        recommendation:
          avgScore < 50
            ? "Группе требуется дополнительное внимание и пересмотр учебного плана"
            : atRiskCount > g.members.length * 0.3
              ? "Значительная часть студентов группы нуждается в поддержке"
              : null,
      };
    })
    .filter((g) => g.recommendation !== null);

  return NextResponse.json({
    atRiskStudents,
    totalAtRisk: atRiskStudents.length,
    systemInsights: {
      tasksByFailRate,
      weakTopics,
      groupRecommendations,
    },
  });
}
