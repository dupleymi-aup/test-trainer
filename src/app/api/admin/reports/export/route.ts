import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { formatZodError } from "@/lib/api-error-handler";

const exportReportSchema = z.object({
  reportType: z.enum([
    "comprehensive",
    "teacher-performance",
    "task-insights",
    "predictions",
    "group-detailed",
    "student-list",
    "attempt-log",
    "item-difficulty",
    "time-score-correlation",
    "completion-funnel",
    "error-patterns",
  ]).default("comprehensive"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  format: z.enum(["csv", "json", "pdf"]).default("csv"),
  groupId: z.string().optional(),
});

/**
 * Sanitize a value to prevent CSV injection attacks.
 * Excel/Calc can execute formulas if a cell starts with =, +, -, @.
 * Also checks trimmed value to catch whitespace-prefixed attacks.
 */
function sanitizeCSVValue(value: string): string {
  const trimmed = value.trimStart();
  if (trimmed.startsWith("=") || trimmed.startsWith("+") || trimmed.startsWith("-") || trimmed.startsWith("@")) {
    return "\t" + value;
  }
  return value;
}

/**
 * Log export activity to the activity log.
 */
async function logExport(userId: string, reportType: string, format: string, details?: Record<string, unknown>) {
  try {
    await db.activityLog.create({
      data: {
        userId,
        action: "EXPORT_REPORT",
        entity: "Report",
        details: JSON.stringify({ reportType, format, ...details }),
      },
    });
  } catch {
    // Silently fail — export should not be blocked by logging errors
  }
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = exportReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const { reportType, startDate, endDate, format, groupId } = parsed.data;

  const userId = guard.session.userId;

  const taskMap = new Map(
    tasks.map((t) => [String(t.id), { name: t.name, difficulty: t.difficulty }])
  );

  // Helper: build data object for JSON export
  if (format === "json") {
    const result: Record<string, unknown> = { reportType, generatedAt: new Date().toISOString() };

    if (reportType === "comprehensive") {
      const [totalStudents, totalTeachers, totalGroups, totalAttempts] = await Promise.all([
        db.user.count({ where: { role: "STUDENT", deletedAt: null } }),
        db.user.count({ where: { role: "TEACHER", deletedAt: null } }),
        db.group.count(),
        db.attempt.count({
          where: {
            createdAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined,
            },
          },
        }),
      ]);
      result.summary = { totalStudents, totalTeachers, totalGroups, totalAttempts };

      const students = await db.user.findMany({
        where: { role: "STUDENT", deletedAt: null },
        select: {
          id: true, name: true, email: true, group: true, university: true,
          attempts: {
            where: {
              createdAt: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
              },
            },
            select: { score: true, ecCoverage: true, bvCoverage: true, createdAt: true },
          },
        },
      });
      result.students = students.map((s) => {
        const attempts = s.attempts;
        return {
          id: s.id, name: s.name, email: s.email, group: s.group, university: s.university,
          attemptsCount: attempts.length,
          bestScore: attempts.length > 0 ? attempts.reduce((max, a) => Math.max(max, a.score), 0) : 0,
          avgScore: attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) : 0,
        };
      });
    } else if (reportType === "teacher-performance") {
      const teachers = await db.user.findMany({
        where: { role: "TEACHER", deletedAt: null },
        select: {
          id: true, name: true, email: true,
          createdGroups: {
            select: {
              id: true, name: true,
              members: {
                select: {
                  user: {
                    select: {
                      id: true, attempts: { select: { score: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });
      result.teachers = teachers.map((t) => {
        const allStudents = new Set(t.createdGroups.flatMap((g) => g.members.map((m) => m.user.id)));
        const allAttempts = t.createdGroups.flatMap((g) =>
          g.members.flatMap((m) => m.user.attempts.map((a) => ({ ...a, userId: m.user.id })))
        );
        return {
          id: t.id, name: t.name || t.email,
          groupsCount: t.createdGroups.length,
          studentsCount: allStudents.size,
          attemptsCount: allAttempts.length,
          avgScore: allAttempts.length > 0 ? Math.round(allAttempts.reduce((s, a) => s + a.score, 0) / allAttempts.length) : 0,
        };
      });
    } else if (reportType === "task-insights") {
      const attempts = await db.attempt.findMany({
        select: { taskId: true, score: true, ecCoverage: true, bvCoverage: true, timeSpent: true },
      });
      const taskData: Record<string, { scores: number[]; ecs: number[]; bvs: number[]; times: number[] }> = {};
      attempts.forEach((a) => {
        if (!taskData[a.taskId]) taskData[a.taskId] = { scores: [], ecs: [], bvs: [], times: [] };
        taskData[a.taskId].scores.push(a.score);
        taskData[a.taskId].ecs.push(a.ecCoverage);
        taskData[a.taskId].bvs.push(a.bvCoverage);
        taskData[a.taskId].times.push(a.timeSpent);
      });
      result.tasks = Object.entries(taskData).map(([taskId, data]) => {
        const meta = taskMap.get(taskId);
        return {
          taskId, taskName: meta?.name || `Задание ${taskId}`,
          difficulty: meta?.difficulty || "Unknown",
          attemptsCount: data.scores.length,
          avgScore: data.scores.length > 0 ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length) : 0,
          avgEc: data.ecs.length > 0 ? Math.round(data.ecs.reduce((s, v) => s + v, 0) / data.ecs.length) : 0,
          avgBv: data.bvs.length > 0 ? Math.round(data.bvs.reduce((s, v) => s + v, 0) / data.bvs.length) : 0,
          avgTime: data.times.length > 0 ? Math.round(data.times.reduce((s, v) => s + v, 0) / data.times.length) : 0,
          failRate: data.scores.length > 0 ? Math.round((data.scores.filter((s) => s < 50).length / data.scores.length) * 100) : 0,
        };
      });
    } else if (reportType === "predictions") {
      const now = new Date();
      const fourteenDaysAgo = new Date(now); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const students = await db.user.findMany({
        where: { role: "STUDENT", deletedAt: null },
        select: {
          id: true, name: true, email: true, group: true, university: true, createdAt: true,
          attempts: { select: { score: true, createdAt: true }, orderBy: { createdAt: "asc" } },
        },
      });
      result.atRiskStudents = students.map((s) => {
        const attempts = s.attempts;
        if (attempts.length === 0) return null;
        const bestScore = attempts.reduce((max, a) => Math.max(max, a.score), 0);
        const avgScore = Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length);
        const lastAttempt = attempts[attempts.length - 1].createdAt;
        const first3 = attempts.slice(0, 3);
        const last3 = attempts.slice(-3);
        const first3Avg = first3.reduce((s, a) => s + a.score, 0) / first3.length;
        const last3Avg = last3.reduce((s, a) => s + a.score, 0) / last3.length;
        const trend = attempts.length >= 6 ? (last3Avg - first3Avg > 15 ? "improving" : last3Avg - first3Avg < -15 ? "declining" : "stable") : "stable";
        const riskFactors: string[] = [];
        if (bestScore < 50) riskFactors.push("low_performer");
        if (trend === "declining") riskFactors.push("declining");
        if (new Date(lastAttempt) < fourteenDaysAgo) riskFactors.push("inactive");
        if (attempts.length < 3 && s.createdAt < sevenDaysAgo) riskFactors.push("low_engagement");
        if (riskFactors.length === 0) return null;
        return { id: s.id, name: s.name, email: s.email, group: s.group, university: s.university, bestScore, avgScore, trend, riskFactors };
      }).filter(Boolean);
    } else if (reportType === "group-detailed" && groupId) {
      const group = await db.group.findUnique({
        where: { id: groupId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true, name: true, email: true, university: true,
                  attempts: { select: { score: true, ecCoverage: true, bvCoverage: true, createdAt: true } },
                },
              },
            },
          },
        },
      });
      if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
      result.group = { id: group.id, name: group.name };
      result.students = group.members.map((m) => {
        const attempts = m.user.attempts;
        return {
          id: m.user.id, name: m.user.name, email: m.user.email, university: m.user.university,
          attemptsCount: attempts.length,
          bestScore: attempts.length > 0 ? attempts.reduce((max, a) => Math.max(max, a.score), 0) : 0,
          avgScore: attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0,
        };
      });
    } else if (reportType === "student-list") {
      const students = await db.user.findMany({
        where: { role: "STUDENT", deletedAt: null },
        select: {
          id: true, name: true, email: true, group: true, university: true, createdAt: true,
          attempts: { select: { score: true, createdAt: true }, orderBy: { createdAt: "asc" } },
        },
      });
      result.students = students.map((s) => {
        const attempts = s.attempts;
        return {
          id: s.id, name: s.name, email: s.email, group: s.group, university: s.university,
          attemptsCount: attempts.length,
          bestScore: attempts.length > 0 ? attempts.reduce((max, a) => Math.max(max, a.score), 0) : 0,
          avgScore: attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) : 0,
          registeredAt: s.createdAt.toISOString(),
        };
      });
    } else if (reportType === "attempt-log") {
      const attempts = await db.attempt.findMany({
        where: {
          createdAt: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
        },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      });
      result.attempts = attempts.map((a) => {
        const task = taskMap.get(a.taskId);
        return {
          studentName: a.user?.name, studentEmail: a.user?.email,
          taskId: a.taskId, taskName: task?.name || `Задание ${a.taskId}`,
          score: a.score, ecCoverage: a.ecCoverage, bvCoverage: a.bvCoverage,
          correctness: a.correctness, timeSpent: a.timeSpent,
          date: a.createdAt.toISOString(),
        };
      });
    } else if (reportType === "item-difficulty") {
      // Fetch attempts for IRT analysis
      const attempts = await db.attempt.findMany({
        select: { taskId: true, score: true, timeSpent: true, userId: true, createdAt: true },
        where: {
          createdAt: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
        },
        orderBy: { createdAt: "asc" },
      });
      const taskAttempts: Record<string, typeof attempts> = {};
      for (const a of attempts) {
        if (!taskAttempts[a.taskId]) taskAttempts[a.taskId] = [];
        taskAttempts[a.taskId].push(a);
      }
      result.itemDifficulty = Object.entries(taskAttempts).map(([taskId, atts]) => {
        const meta = taskMap.get(taskId);
        const scores = atts.map((a) => a.score);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
        return {
          taskId, taskName: meta?.name || `Задание ${taskId}`,
          attemptsCount: atts.length, avgScore,
          pValue: Math.round((avgScore / 100) * 1000) / 1000,
        };
      });
    } else if (reportType === "time-score-correlation") {
      const attempts = await db.attempt.findMany({
        select: { taskId: true, score: true, timeSpent: true, userId: true },
        where: { timeSpent: { gt: 0 }, createdAt: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined } },
        take: 10_000,
      });
      result.timeScoreData = attempts.map((a) => {
        const meta = taskMap.get(a.taskId);
        return { taskId: a.taskId, taskName: meta?.name || `Задание ${a.taskId}`, score: a.score, timeSpent: Math.round(a.timeSpent / 60) };
      });
    } else if (reportType === "completion-funnel") {
      const students = await db.user.findMany({ where: { role: "STUDENT", deletedAt: null }, select: { id: true } });
      const attempts = await db.attempt.findMany({ select: { taskId: true, userId: true, score: true } });
      const studentsByTask: Record<string, number> = {};
      for (const a of attempts) {
        if (!studentsByTask[a.taskId]) studentsByTask[a.taskId] = 0;
        studentsByTask[a.taskId]++;
      }
      result.funnel = Object.entries(studentsByTask).map(([taskId, count]) => {
        const meta = taskMap.get(taskId);
        return { taskId, taskName: meta?.name || `Задание ${taskId}`, uniqueStudents: count };
      }).sort((a, b) => Number(a.taskId) - Number(b.taskId));
    } else if (reportType === "error-patterns") {
      const attempts = await db.attempt.findMany({
        select: { taskId: true, score: true, ecCoverage: true, bvCoverage: true },
        where: { createdAt: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined } },
        take: 10_000,
      });
      result.errorPatterns = attempts.filter((a) => a.score < 60).map((a) => {
        const meta = taskMap.get(a.taskId);
        return { taskId: a.taskId, taskName: meta?.name || `Задание ${a.taskId}`, score: a.score, ecCoverage: a.ecCoverage, bvCoverage: a.bvCoverage };
      });
    }

    const jsonContent = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const buffer = Buffer.from(await blob.arrayBuffer());

    await logExport(userId, reportType, "json", { startDate, endDate, groupId });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="admin-report-${reportType}.json"`,
      },
    });
  }

  // CSV export (existing logic below)

  if (reportType === "comprehensive") {
    // Comprehensive platform report
    const lines: string[] = [];

    // Summary section
    lines.push("=== Сводка платформы ===");
    lines.push(["Метрика", "Значение"].join(";"));

    const [totalStudents, totalTeachers, totalGroups, totalAttempts] = await Promise.all([
      db.user.count({ where: { role: "STUDENT", deletedAt: null } }),
      db.user.count({ where: { role: "TEACHER", deletedAt: null } }),
      db.group.count(),
      db.attempt.count({
        where: {
          createdAt: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
        },
      }),
    ]);

    lines.push(["Всего студентов", String(totalStudents)].join(";"));
    lines.push(["Всего преподавателей", String(totalTeachers)].join(";"));
    lines.push(["Всего групп", String(totalGroups)].join(";"));
    lines.push(["Всего попыток", String(totalAttempts)].join(";"));
    lines.push("");

    // Students section
    lines.push("=== Студенты ===");
    lines.push(["Имя", "Email", "Группа", "Университет", "Попыток", "Лучший балл", "Средний балл", "Ср. EC", "Ср. BV", "Последняя попытка"].join(";"));

    const students = await db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      select: {
        id: true, name: true, email: true, group: true, university: true,
        attempts: {
          where: {
            createdAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined,
            },
          },
          select: { score: true, ecCoverage: true, bvCoverage: true, createdAt: true },
        },
      },
    });

    for (const s of students) {
      const attempts = s.attempts;
      const bestScore = attempts.length > 0 ? attempts.reduce((max, a) => Math.max(max, a.score), 0) : 0;
      const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) : 0;
      const avgEc = attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.ecCoverage, 0) / attempts.length) : 0;
      const avgBv = attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.bvCoverage, 0) / attempts.length) : 0;
      const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1].createdAt : null;

      lines.push([
        `"${sanitizeCSVValue(s.name ?? "")}"`,
        `"${sanitizeCSVValue(s.email ?? "")}"`,
        `"${sanitizeCSVValue(s.group ?? "")}"`,
        `"${sanitizeCSVValue(s.university ?? "")}"`,
        String(attempts.length),
        String(bestScore),
        String(avgScore),
        String(avgEc),
        String(avgBv),
        lastAttempt ? new Date(lastAttempt).toLocaleDateString("ru-RU") : "Нет",
      ].join(";"));
    }

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const buffer = Buffer.from(await blob.arrayBuffer());

    await logExport(userId, "comprehensive", "csv", { startDate, endDate });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": 'attachment; filename="admin-report-comprehensive.csv"',
      },
    });
  }

  if (reportType === "teacher-performance") {
    const lines: string[] = [];
    lines.push("=== Аналитика по преподавателям ===");
    lines.push(["Преподаватель", "Группы", "Студенты", "Ср. балл", "Попыток на студента", "Активность %"].join(";"));

    const teachers = await db.user.findMany({
      where: { role: "TEACHER", deletedAt: null },
      select: {
        id: true, name: true, email: true,
        createdGroups: {
          select: {
            id: true, name: true,
            members: {
              select: {
                user: {
                  select: {
                    id: true, attempts: { select: { score: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const t of teachers) {
      const allStudents = new Set(t.createdGroups.flatMap((g) => g.members.map((m) => m.user.id)));
      const allAttempts = t.createdGroups.flatMap((g) =>
        g.members.flatMap((m) => m.user.attempts.map((a) => ({ ...a, userId: m.user.id })))
      );
      const avgScore = allAttempts.length > 0 ? Math.round(allAttempts.reduce((s, a) => s + a.score, 0) / allAttempts.length) : 0;

      lines.push([
        `"${sanitizeCSVValue(t.name || t.email || "")}"`,
        String(t.createdGroups.length),
        String(allStudents.size),
        String(avgScore),
        String(allStudents.size > 0 ? Math.round(allAttempts.length / allStudents.size) : 0),
        String(allStudents.size > 0 ? Math.round((allStudents.size - [...allStudents].filter((sid) => {
          const sa = allAttempts.filter((a) => a.userId === sid);
          return sa.length === 0;
        }).length) / allStudents.size * 100) : 0),
      ].join(";"));
    }

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const buffer = Buffer.from(await blob.arrayBuffer());

    await logExport(userId, "teacher-performance", "csv");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": 'attachment; filename="admin-report-teacher-performance.csv"',
      },
    });
  }

  if (reportType === "task-insights") {
    const lines: string[] = [];
    lines.push("=== Анализ задач ===");
    lines.push(["Задача", "Сложность", "Попыток", "Ср. балл", "Ср. EC", "Ср. BV", "Ср. время (с)", "Отказы %"].join(";"));

    const attempts = await db.attempt.findMany({
      select: { taskId: true, score: true, ecCoverage: true, bvCoverage: true, timeSpent: true },
    });

    const taskData: Record<string, { scores: number[]; ecs: number[]; bvs: number[]; times: number[] }> = {};
    attempts.forEach((a) => {
      if (!taskData[a.taskId]) taskData[a.taskId] = { scores: [], ecs: [], bvs: [], times: [] };
      taskData[a.taskId].scores.push(a.score);
      taskData[a.taskId].ecs.push(a.ecCoverage);
      taskData[a.taskId].bvs.push(a.bvCoverage);
      taskData[a.taskId].times.push(a.timeSpent);
    });

    for (const [taskId, data] of Object.entries(taskData)) {
      const meta = taskMap.get(taskId);
      const avgScore = data.scores.length > 0 ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length) : 0;
      const failRate = data.scores.length > 0 ? Math.round((data.scores.filter((s) => s < 50).length / data.scores.length) * 100) : 0;
      const avgEc = data.ecs.length > 0 ? Math.round(data.ecs.reduce((s, v) => s + v, 0) / data.ecs.length) : 0;
      const avgBv = data.bvs.length > 0 ? Math.round(data.bvs.reduce((s, v) => s + v, 0) / data.bvs.length) : 0;
      const avgTime = data.times.length > 0 ? Math.round(data.times.reduce((s, v) => s + v, 0) / data.times.length) : 0;

      lines.push([
        `"${sanitizeCSVValue(meta?.name || `Задание ${taskId}`)}"`,
        meta?.difficulty || "Unknown",
        String(data.scores.length),
        String(avgScore),
        String(avgEc),
        String(avgBv),
        String(avgTime),
        String(failRate),
      ].join(";"));
    }

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const buffer = Buffer.from(await blob.arrayBuffer());

    await logExport(userId, "task-insights", "csv");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": 'attachment; filename="admin-report-task-insights.csv"',
      },
    });
  }

  if (reportType === "predictions") {
    const lines: string[] = [];
    lines.push("=== Прогнозы и риски ===");
    lines.push(["Имя", "Email", "Группа", "Университет", "Лучший балл", "Средний балл", "Попыток", "Тренд", "Факторы риска"].join(";"));

    const now = new Date();
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const students = await db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      select: {
        id: true, name: true, email: true, group: true, university: true, createdAt: true,
        attempts: { select: { score: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      },
    });

    for (const s of students) {
      const attempts = s.attempts;
      if (attempts.length === 0) continue;

      const bestScore = attempts.reduce((max, a) => Math.max(max, a.score), 0);
      const avgScore = Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length);
      const lastAttempt = attempts[attempts.length - 1].createdAt;

      const first3 = attempts.slice(0, 3);
      const last3 = attempts.slice(-3);
      const first3Avg = first3.reduce((s, a) => s + a.score, 0) / first3.length;
      const last3Avg = last3.reduce((s, a) => s + a.score, 0) / last3.length;
      const trend = attempts.length >= 6 ? (last3Avg - first3Avg > 15 ? "Улучшение" : last3Avg - first3Avg < -15 ? "Снижение" : "Стабильно") : "Стабильно";

      const riskFactors: string[] = [];
      if (bestScore < 50) riskFactors.push("Низкий балл");
      if (trend === "Снижение") riskFactors.push("Снижение");
      if (new Date(lastAttempt) < fourteenDaysAgo) riskFactors.push("Неактивен");
      if (attempts.length < 3 && s.createdAt < sevenDaysAgo) riskFactors.push("Мало попыток");

      if (riskFactors.length === 0) continue;

      lines.push([
        `"${sanitizeCSVValue(s.name ?? "")}"`,
        `"${sanitizeCSVValue(s.email ?? "")}"`,
        `"${sanitizeCSVValue(s.group ?? "")}"`,
        `"${sanitizeCSVValue(s.university ?? "")}"`,
        String(bestScore),
        String(avgScore),
        String(attempts.length),
        trend,
        `"${riskFactors.join(", ")}"`,
      ].join(";"));
    }

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const buffer = Buffer.from(await blob.arrayBuffer());

    await logExport(userId, "predictions", "csv");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": 'attachment; filename="admin-report-predictions.csv"',
      },
    });
  }

  if (reportType === "group-detailed") {
    if (!groupId) {
      return NextResponse.json({ error: "groupId is required for group-detailed export" }, { status: 400 });
    }

    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true, name: true, email: true, university: true,
                attempts: { select: { score: true, ecCoverage: true, bvCoverage: true, createdAt: true } },
              },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const lines: string[] = [];
    lines.push(`=== Группа: ${group.name} ===`);
    lines.push(["Имя", "Email", "Университет", "Попыток", "Лучший балл", "Средний балл", "Ср. EC", "Ср. BV", "Последняя попытка"].join(";"));

    for (const m of group.members) {
      const attempts = m.user.attempts;
      const bestScore = attempts.length > 0 ? attempts.reduce((max, a) => Math.max(max, a.score), 0) : 0;
      const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0;
      const avgEc = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.ecCoverage, 0) / attempts.length) : 0;
      const avgBv = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.bvCoverage, 0) / attempts.length) : 0;
      const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1].createdAt : null;

      lines.push([
        `"${sanitizeCSVValue(m.user.name ?? "")}"`,
        `"${sanitizeCSVValue(m.user.email ?? "")}"`,
        `"${sanitizeCSVValue(m.user.university ?? "")}"`,
        String(attempts.length),
        String(bestScore),
        String(avgScore),
        String(avgEc),
        String(avgBv),
        lastAttempt ? new Date(lastAttempt).toLocaleDateString("ru-RU") : "Нет",
      ].join(";"));
    }

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const buffer = Buffer.from(await blob.arrayBuffer());

    await logExport(userId, "group-detailed", "csv", { groupId, groupName: group.name });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="admin-report-group-${group.name.replace(/\s+/g, "-")}.csv"`,
      },
    });
  }

  if (reportType === "student-list") {
    const lines: string[] = [];
    lines.push("=== Список студентов ===");
    lines.push(["Имя", "Email", "Группа", "Университет", "Попыток", "Лучший балл", "Средний балл", "Уровень риска", "Тренд", "Дата регистрации"].join(";"));

    const students = await db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      select: {
        id: true, name: true, email: true, group: true, university: true, createdAt: true,
        attempts: { select: { score: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      },
    });

    const now = new Date();
    const fourteenDaysAgo = new Date(now); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const s of students) {
      const attempts = s.attempts;
      const bestScore = attempts.length > 0 ? attempts.reduce((max, a) => Math.max(max, a.score), 0) : 0;
      const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) : 0;
      const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1].createdAt : null;

      // Trend
      const first3 = attempts.slice(0, 3);
      const last3 = attempts.slice(-3);
      const first3Avg = first3.length > 0 ? first3.reduce((s, a) => s + a.score, 0) / first3.length : 0;
      const last3Avg = last3.length > 0 ? last3.reduce((s, a) => s + a.score, 0) / last3.length : 0;
      const trend = attempts.length >= 6
        ? last3Avg - first3Avg > 15 ? "Улучшение" : last3Avg - first3Avg < -15 ? "Снижение" : "Стабильно"
        : "Стабильно";

      // Risk
      const riskFactors: string[] = [];
      if (bestScore < 50 && attempts.length > 0) riskFactors.push("Низкий балл");
      if (trend === "Снижение") riskFactors.push("Снижение");
      if (lastAttempt && new Date(lastAttempt) < fourteenDaysAgo) riskFactors.push("Неактивен");
      if (attempts.length < 3 && s.createdAt < sevenDaysAgo) riskFactors.push("Мало попыток");
      const riskLevel = riskFactors.length >= 3 ? "Высокий" : riskFactors.length >= 2 ? "Средний" : riskFactors.length >= 1 ? "Низкий" : "Нет";

      lines.push([
        `"${sanitizeCSVValue(s.name ?? "")}"`,
        `"${sanitizeCSVValue(s.email ?? "")}"`,
        `"${sanitizeCSVValue(s.group ?? "")}"`,
        `"${sanitizeCSVValue(s.university ?? "")}"`,
        String(attempts.length),
        String(bestScore),
        String(avgScore),
        riskLevel,
        trend,
        new Date(s.createdAt).toLocaleDateString("ru-RU"),
      ].join(";"));
    }

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const buffer = Buffer.from(await blob.arrayBuffer());

    await logExport(userId, "student-list", "csv");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": 'attachment; filename="admin-report-student-list.csv"',
      },
    });
  }

  if (reportType === "attempt-log") {
    const lines: string[] = [];
    lines.push("=== Журнал попыток ===");
    lines.push(["Студент", "Email", "Задача", "Балл", "EC", "BV", "Корректность", "Время (с)", "Дата"].join(";"));

    const attempts = await db.attempt.findMany({
      where: {
        createdAt: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    for (const a of attempts) {
      const task = taskMap.get(a.taskId);
      lines.push([
        `"${sanitizeCSVValue(a.user?.name ?? "")}"`,
        `"${sanitizeCSVValue(a.user?.email ?? "")}"`,
        `"${sanitizeCSVValue(task?.name || `Задание ${a.taskId}`)}"`,
        String(a.score),
        String(a.ecCoverage),
        String(a.bvCoverage),
        String(a.correctness),
        String(a.timeSpent),
        new Date(a.createdAt).toLocaleDateString("ru-RU"),
      ].join(";"));
    }

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const buffer = Buffer.from(await blob.arrayBuffer());

    await logExport(userId, "attempt-log", "csv", { startDate, endDate });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": 'attachment; filename="admin-report-attempt-log.csv"',
      },
    });
  }

  // PDF export — simple text-based report using jsPDF
  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    doc.setFont("helvetica");
    doc.setFontSize(16);
    doc.text("Отчёт администратора платформы", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Сгенерирован: ${new Date().toLocaleString("ru-RU")}`, 14, 28);
    doc.text(`Тип отчёта: ${reportType}`, 14, 33);

    doc.setLineWidth(0.5);
    doc.line(14, 37, 196, 37);

    let y = 45;
    const addSection = (title: string, lines: string[]) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(title, 14, y);
      y += 7;
      doc.setFontSize(9);
      doc.setTextColor(60);
      doc.setFont("helvetica", "normal");
      for (const line of lines) {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, 14, y);
        y += 5;
      }
      y += 4;
    };

    // Fetch summary data for the PDF
    const [totalStudents, totalTeachers, totalGroups, totalAttempts] = await Promise.all([
      db.user.count({ where: { role: "STUDENT", deletedAt: null } }),
      db.user.count({ where: { role: "TEACHER", deletedAt: null } }),
      db.group.count(),
      db.attempt.count({
        where: {
          createdAt: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
        },
      }),
    ]);

    const avgScoreResult = await db.attempt.aggregate({
      _avg: { score: true },
      where: {
        createdAt: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
    });
    const avgScore = Math.round(avgScoreResult._avg.score ?? 0);

    addSection("Ключевые метрики", [
      `Студенты: ${totalStudents}`,
      `Преподаватели: ${totalTeachers}`,
      `Группы: ${totalGroups}`,
      `Попытки: ${totalAttempts}`,
      `Средний балл: ${avgScore}%`,
    ]);

    // Top groups
    const groups = await db.group.findMany({ select: { id: true, name: true } });
    const allGroupMembers = await db.userGroup.findMany({
      where: { groupId: { in: groups.map((g) => g.id) } },
      select: { userId: true, groupId: true },
    });
    const membersByGroup: Record<string, string[]> = {};
    for (const m of allGroupMembers) {
      if (!membersByGroup[m.groupId]) membersByGroup[m.groupId] = [];
      membersByGroup[m.groupId].push(m.userId);
    }
    const memberIds = [...new Set(allGroupMembers.map((m) => m.userId))];

    const scoresByUser: Record<string, { totalScore: number; count: number }> = {};
    if (memberIds.length > 0) {
      const userAggregations = await db.attempt.groupBy({
        by: ["userId"],
        _sum: { score: true },
        _count: { _all: true },
      });
      for (const agg of userAggregations) {
        scoresByUser[agg.userId] = {
          totalScore: agg._sum.score ?? 0,
          count: agg._count._all,
        };
      }
    }

    interface GroupScore { name: string; avg: number; count: number }

    const groupScores: GroupScore[] = groups
      .map((g): GroupScore | null => {
        const userIds = membersByGroup[g.id] || [];
        let totalScore = 0;
        let totalCount = 0;
        for (const uid of userIds) {
          const u = scoresByUser[uid];
          if (u) {
            totalScore += u.totalScore;
            totalCount += u.count;
          }
        }
        if (totalCount === 0) return null;
        return { name: g.name, avg: Math.round(totalScore / totalCount), count: totalCount };
      })
      .filter((g): g is GroupScore => g !== null)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10);

    addSection(
      "Топ группы",
      groupScores.map((g, i: number) => `${i + 1}. ${g.name} — ${g.avg}% (${g.count} попыток)`)
    );

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    await logExport(userId, reportType, "pdf", { startDate, endDate });

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="admin-report-${reportType}.pdf"`,
      },
    });
  }

  // Default: JSON export for all analytics
  const baseUrl = req.headers.get("host")
    ? `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host")}`
    : "http://localhost:3000";

  let analytics;
  try {
    const res = await fetch(`${baseUrl}/api/admin/analytics/comprehensive`);
    if (!res.ok) {
      throw new Error(`Internal fetch failed: HTTP ${res.status}`);
    }
    analytics = await res.json();
  } catch (error) {
    logger.error("Failed to fetch comprehensive analytics for export", error instanceof Error ? error : undefined);
    analytics = { error: "Could not generate analytics report. Try again later." };
  }

  return NextResponse.json(analytics, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="admin-report-comprehensive.json"',
    },
  });
}
