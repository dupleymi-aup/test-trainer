import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";

/**
 * Sanitize a value to prevent CSV injection attacks.
 */
function sanitizeCSVValue(value: string): string {
  if (value.startsWith("=") || value.startsWith("+") || value.startsWith("-") || value.startsWith("@")) {
    return "\t" + value;
  }
  return value;
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  const body = await req.json();
  const { reportType = "comprehensive", startDate, endDate, format = "csv" } = body;

  const taskMap = new Map(
    tasks.map((t) => [String(t.id), { name: t.name, difficulty: t.difficulty }])
  );

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
      const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;
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

      const bestScore = Math.max(...attempts.map((a) => a.score));
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

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": 'attachment; filename="admin-report-predictions.csv"',
      },
    });
  }

  if (reportType === "group-detailed") {
    const { groupId } = body;
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
      const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;
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
      const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;
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

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": 'attachment; filename="admin-report-attempt-log.csv"',
      },
    });
  }

  // Default: JSON export for all analytics
  const baseUrl = req.headers.get("host")
    ? `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host")}`
    : "http://localhost:3000";
  const analytics = await fetch(`${baseUrl}/api/admin/analytics/comprehensive`).then((r) => r.json());

  return NextResponse.json(analytics, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="admin-report-comprehensive.json"',
    },
  });
}
