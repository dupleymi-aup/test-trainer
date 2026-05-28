import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { computeStudentRisk, AttemptData } from "@/lib/risk-analysis";
import { logger } from "@/lib/logger";
import { MS_PER_DAY } from "@/lib/time-constants";

export interface SystemAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  entity: { type: string; id: string; name: string };
  createdAt: string;
  actionable: boolean;
  actionUrl?: string;
}

export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const alerts: SystemAlert[] = [];

  // 1. At-risk students (high dropout risk)
  const students = await db.user.findMany({
    where: { role: "STUDENT", deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      group: true,
      createdAt: true,
      attempts: {
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

  for (const s of students) {
    const attempts: AttemptData[] = s.attempts.map((a) => ({
      score: a.score,
      ecCoverage: a.ecCoverage,
      bvCoverage: a.bvCoverage,
      createdAt: a.createdAt,
    }));

    if (attempts.length === 0) {
      // Student registered but no attempts
      if (s.createdAt < sevenDaysAgo) {
        alerts.push({
          id: `no-attempts-${s.id}`,
          severity: "warning",
          category: "STUDENT_ENGAGEMENT",
          title: "Студент без попыток",
          description: `${s.name || s.email} зарегистрирован более 7 дней назад, но не выполнил ни одного задания`,
          entity: { type: "student", id: s.id, name: s.name || s.email || "Unknown" },
          createdAt: s.createdAt.toISOString(),
          actionable: true,
          actionUrl: `/admin/analytics/student/${s.id}`,
        });
      }
      continue;
    }

    const risk = computeStudentRisk(attempts, s.createdAt);

    if (risk.dropoutRisk === "high") {
      alerts.push({
        id: `high-risk-${s.id}`,
        severity: "critical",
        category: "STUDENT_RISK",
        title: "Студент с высоким риском",
        description: `${s.name || s.email}: ${risk.riskFactors.length} факторов риска (${risk.riskFactors.join(", ")}). Тренд: ${risk.trend}`,
        entity: { type: "student", id: s.id, name: s.name || s.email || "Unknown" },
        createdAt: now.toISOString(),
        actionable: true,
        actionUrl: `/admin/analytics/student/${s.id}`,
      });
    } else if (risk.dropoutRisk === "medium" && risk.trend === "declining") {
      alerts.push({
        id: `declining-${s.id}`,
        severity: "warning",
        category: "STUDENT_DECLINE",
        title: "Снижение успеваемости",
        description: `${s.name || s.email}: средний балл снижается. Факторы: ${risk.riskFactors.join(", ")}`,
        entity: { type: "student", id: s.id, name: s.name || s.email || "Unknown" },
        createdAt: now.toISOString(),
        actionable: true,
        actionUrl: `/admin/analytics/student/${s.id}`,
      });
    }
  }

  // 2. Groups with low performance
  const groups = await db.group.findMany({
    select: {
      id: true,
      name: true,
      members: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              attempts: { select: { score: true, createdAt: true } },
            },
          },
        },
      },
    },
  });

  for (const g of groups) {
    const studentScores: number[] = [];
    let inactiveCount = 0;

    for (const m of g.members) {
      const attempts = m.user.attempts;
      if (attempts.length > 0) {
        const avg = Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length);
        studentScores.push(avg);
        const lastAttempt = attempts[attempts.length - 1].createdAt;
        if (lastAttempt < thirtyDaysAgo) inactiveCount++;
      } else {
        inactiveCount++;
      }
    }

    const avgScore = studentScores.length > 0
      ? Math.round(studentScores.reduce((s, v) => s + v, 0) / studentScores.length)
      : 0;
    const inactiveRate = g.members.length > 0
      ? Math.round((inactiveCount / g.members.length) * 100)
      : 0;

    if (g.members.length > 0 && avgScore < 40 && studentScores.length > 0) {
      alerts.push({
        id: `low-group-${g.id}`,
        severity: "critical",
        category: "GROUP_PERFORMANCE",
        title: "Низкая успеваемость группы",
        description: `Группа "${g.name}": средний балл ${avgScore}%. Требуется пересмотр учебного плана`,
        entity: { type: "group", id: g.id, name: g.name },
        createdAt: now.toISOString(),
        actionable: true,
        actionUrl: `/admin/analytics/group/${g.id}`,
      });
    }

    if (inactiveRate >= 50 && g.members.length >= 3) {
      alerts.push({
        id: `inactive-group-${g.id}`,
        severity: "warning",
        category: "GROUP_INACTIVE",
        title: "Группа неактивна",
        description: `Группа "${g.name}": ${inactiveRate}% студентов неактивны 30+ дней`,
        entity: { type: "group", id: g.id, name: g.name },
        createdAt: now.toISOString(),
        actionable: true,
        actionUrl: `/admin/groups`,
      });
    }
  }

  // 3. Tasks with high fail rate
  const allAttempts = await db.attempt.findMany({
    select: { taskId: true, score: true },
    take: 10_000,
    orderBy: { createdAt: "desc" },
  });

  const taskScores: Record<string, number[]> = {};
  for (const a of allAttempts) {
    if (!taskScores[a.taskId]) taskScores[a.taskId] = [];
    taskScores[a.taskId].push(a.score);
  }

  for (const [taskId, scores] of Object.entries(taskScores)) {
    if (scores.length < 5) continue; // need minimum sample
    const failRate = Math.round((scores.filter((s) => s < 50).length / scores.length) * 100);
    if (failRate >= 60) {
      alerts.push({
        id: `high-fail-task-${taskId}`,
        severity: "warning",
        category: "TASK_DIFFICULTY",
        title: `Задание #${taskId} — высокий процент неудач`,
        description: `${failRate}% попыток с баллом < 50% (всего попыток: ${scores.length}). Возможно, задание слишком сложное`,
        entity: { type: "task", id: taskId, name: `Задание #${taskId}` },
        createdAt: now.toISOString(),
        actionable: false,
      });
    }
  }

  const typeLabels: Record<string, string> = {
    EXAM: "Экзамен",
    TEST: "Зачёт",
    ASSIGNMENT: "Задание",
    COURSE_END: "Окончание курса",
    REGISTRATION_END: "Окончание регистрации",
  };

  // 4. Deadline alerts — overdue and approaching
  const nowDate = new Date();
  const fortyEightHoursFromNow = new Date(nowDate);
  fortyEightHoursFromNow.setHours(fortyEightHoursFromNow.getHours() + 48);

  // Overdue deadlines
  const overdueDeadlines = await db.deadline.findMany({
    where: {
      dueDate: { lt: nowDate },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      type: true,
      group: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  for (const d of overdueDeadlines) {
    const daysOverdue = Math.floor((nowDate.getTime() - d.dueDate.getTime()) / MS_PER_DAY);
    const groupName = d.group ? ` (группа: ${d.group.name})` : " (системный)";
    const typeLabel = typeLabels[d.type] || d.type;

    alerts.push({
      id: `overdue-deadline-${d.id}`,
      severity: "critical",
      category: "DEADLINE_OVERDUE",
      title: `Просрочен: ${d.title}`,
      description: `${typeLabel}${groupName} просрочен на ${daysOverdue} дн. (${d.dueDate.toLocaleDateString("ru-RU")})`,
      entity: { type: "deadline", id: d.id, name: d.title },
      createdAt: nowDate.toISOString(),
      actionable: true,
      actionUrl: `/admin/deadlines`,
    });
  }

  // Approaching deadlines (within 48 hours)
  const approachingDeadlines = await db.deadline.findMany({
    where: {
      dueDate: { gte: nowDate, lte: fortyEightHoursFromNow },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      type: true,
      group: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  for (const d of approachingDeadlines) {
    const hoursLeft = Math.floor((d.dueDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60));
    const groupName = d.group ? ` (группа: ${d.group.name})` : " (системный)";
    const typeLabel = typeLabels[d.type] || d.type;

    alerts.push({
      id: `approaching-deadline-${d.id}`,
      severity: "warning",
      category: "DEADLINE_APPROACHING",
      title: `Скоро: ${d.title}`,
      description: `${typeLabel}${groupName} через ${hoursLeft} ч. (${d.dueDate.toLocaleString("ru-RU")})`,
      entity: { type: "deadline", id: d.id, name: d.title },
      createdAt: nowDate.toISOString(),
      actionable: true,
      actionUrl: `/admin/deadlines`,
    });
  }

  // 5. Teachers with no active groups
  const teachers = await db.user.findMany({
    where: { role: "TEACHER", deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      createdGroups: {
        select: {
          members: {
            select: {
              user: {
                select: {
                  attempts: { select: { createdAt: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  for (const t of teachers) {
    if (t.createdGroups.length === 0) {
      alerts.push({
        id: `no-groups-teacher-${t.id}`,
        severity: "info",
        category: "TEACHER_INACTIVE",
        title: "Преподаватель без групп",
        description: `${t.name || t.email} не создал ни одной группы`,
        entity: { type: "teacher", id: t.id, name: t.name || t.email || "Unknown" },
        createdAt: now.toISOString(),
        actionable: true,
        actionUrl: `/admin/groups`,
      });
    } else {
      // Check if any group has recent activity
      let hasRecentActivity = false;
      for (const g of t.createdGroups) {
        for (const m of g.members) {
          if (m.user.attempts.some((a) => a.createdAt >= thirtyDaysAgo)) {
            hasRecentActivity = true;
            break;
          }
        }
        if (hasRecentActivity) break;
      }
      if (!hasRecentActivity) {
        alerts.push({
          id: `inactive-teacher-${t.id}`,
          severity: "info",
          category: "TEACHER_INACTIVE",
          title: "Преподаватель неактивен",
          description: `${t.name || t.email}: нет активности в группах за последние 30 дней`,
          entity: { type: "teacher", id: t.id, name: t.name || t.email || "Unknown" },
          createdAt: now.toISOString(),
          actionable: false,
        });
      }
    }
  }

  // Sort: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Summary
  const summary = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length,
    total: alerts.length,
    actionable: alerts.filter((a) => a.actionable).length,
    categories: [...new Set(alerts.map((a) => a.category))],
  };

  return NextResponse.json({ alerts, summary }, { status: 200 });
  } catch (error) {
    logger.error("alerts-route failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
