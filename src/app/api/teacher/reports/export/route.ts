import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { formatZodError } from "@/lib/api-error-handler";

const exportSchema = z.object({
  groupId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  exportType: z.enum(["summary", "detailed", "at-risk"]).default("summary"),
});

/**
 * Sanitize a value to prevent CSV injection attacks.
 * Excel/Calc can execute formulas if a cell starts with =, +, -, @.
 * Also checks trimmed value to catch whitespace-prefixed attacks while keeping data readable.
 */
function sanitizeCSVValue(value: string): string {
  const trimmed = value.trimStart();
  if (trimmed.startsWith("=") || trimmed.startsWith("+") || trimmed.startsWith("-") || trimmed.startsWith("@")) {
    return "\t" + value;
  }
  return value;
}

export async function POST(req: Request) {
  const guard = await requireTeacherOrAdmin();
  if ("response" in guard) return guard.response;
  const { session } = guard;

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { groupId, startDate, endDate, exportType } = parsed.data;

    // Require groupId to prevent teachers from exporting all students on the platform
    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    // Verify the teacher owns this group (admins can export any group)
    const group = await db.group.findUnique({ where: { id: groupId }, select: { createdByUserId: true } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (session.role !== "ADMIN" && group.createdByUserId !== session.userId) {
      return NextResponse.json({ error: "Forbidden: you can only export data from your own groups" }, { status: 403 });
    }

    // Build student query
    const where: Record<string, unknown> = {
      role: "STUDENT",
      deletedAt: null,
      groups: { some: { groupId } },
    };

    const students = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        group: true,
        university: true,
        createdAt: true,
        attempts: {
          where: {
            createdAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined,
            },
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            score: true,
            ecCoverage: true,
            bvCoverage: true,
            correctness: true,
            timeSpent: true,
            createdAt: true,
            taskId: true,
          },
        },
      },
    });

    const now = new Date();
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Generate CSV based on export type
    const lines: string[] = [];

    if (exportType === "detailed") {
      // Detailed: one row per attempt
      lines.push(
        [
          "Имя",
          "Email",
          "Группа",
          "Университет",
          "ID попытки",
          "Задание",
          "Балл",
          "EC",
          "BV",
          "Корректность",
          "Время (с)",
          "Дата",
        ].join(";")
      );

      for (const s of students) {
        if (s.attempts.length === 0) continue;

        for (const attempt of s.attempts) {
          lines.push(
            [
              `"${sanitizeCSVValue(s.name ?? "")}"`,
              `"${sanitizeCSVValue(s.email ?? "")}"`,
              `"${sanitizeCSVValue(s.group ?? "")}"`,
              `"${sanitizeCSVValue(s.university ?? "")}"`,
              attempt.id,
              attempt.taskId,
              String(attempt.score),
              String(attempt.ecCoverage),
              String(attempt.bvCoverage),
              String(attempt.correctness),
              String(attempt.timeSpent),
              new Date(attempt.createdAt).toLocaleString("ru-RU"),
            ].join(";")
          );
        }
      }
    } else if (exportType === "at-risk") {
      // At-risk students report
      lines.push(
        [
          "Имя",
          "Email",
          "Группа",
          "Лучший балл",
          "Средний балл",
          "Попыток",
          "Последняя попытка",
          "Факторы риска",
        ].join(";")
      );

      for (const s of students) {
        const attempts = s.attempts;
        const bestScore =
          attempts.reduce((max, a) => Math.max(max, a.score), 0);
        const avgScore =
          attempts.length > 0
            ? Math.round(
                attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
              )
            : 0;
        const lastAttempt =
          attempts.length > 0 ? attempts[attempts.length - 1].createdAt : null;

        // Check risk factors
        const riskFactors: string[] = [];
        if (bestScore < 50 && attempts.length > 0)
          riskFactors.push("Низкий балл");
        if (
          attempts.length >= 6 &&
          attempts.slice(-3).reduce((s, a) => s + a.score, 0) / 3 -
            attempts.slice(0, 3).reduce((s, a) => s + a.score, 0) / 3 <
            -15
        )
          riskFactors.push("Снижение");
        if (lastAttempt && lastAttempt < fourteenDaysAgo)
          riskFactors.push("Неактивен");
        if (attempts.length < 3 && s.createdAt < sevenDaysAgo)
          riskFactors.push("Мало попыток");

        if (riskFactors.length === 0) continue;

        lines.push(
          [
            `"${sanitizeCSVValue(s.name ?? "")}"`,
            `"${sanitizeCSVValue(s.email ?? "")}"`,
            `"${sanitizeCSVValue(s.group ?? "")}"`,
            String(bestScore),
            String(avgScore),
            String(attempts.length),
            lastAttempt ? new Date(lastAttempt).toLocaleDateString("ru-RU") : "Нет",
            `"${riskFactors.join(", ")}"`,
          ].join(";")
        );
      }
    } else {
      // Summary (default): one row per student
      lines.push(
        [
          "Имя",
          "Email",
          "Телефон",
          "Группа",
          "Университет",
          "Дата регистрации",
          "Попыток",
          "Лучший балл",
          "Средний балл",
          "Ср. EC",
          "Ср. BV",
          "Ср. корректность",
          "Ср. время (с)",
          "Последняя попытка",
        ].join(";")
      );

      for (const s of students) {
        const attempts = s.attempts;
        const bestScore =
          attempts.reduce((max, a) => Math.max(max, a.score), 0);
        const avgScore =
          attempts.length > 0
            ? Math.round(
                attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
              )
            : 0;
        const avgEc =
          attempts.length > 0
            ? Math.round(
                attempts.reduce((sum, a) => sum + a.ecCoverage, 0) /
                  attempts.length
              )
            : 0;
        const avgBv =
          attempts.length > 0
            ? Math.round(
                attempts.reduce((sum, a) => sum + a.bvCoverage, 0) /
                  attempts.length
              )
            : 0;
        const avgCorrectness =
          attempts.length > 0
            ? Math.round(
                attempts.reduce((sum, a) => sum + a.correctness, 0) /
                  attempts.length
              )
            : 0;
        const avgTime =
          attempts.length > 0
            ? Math.round(
                attempts.reduce((sum, a) => sum + a.timeSpent, 0) /
                  attempts.length
              )
            : 0;
        const lastAttempt =
          attempts.length > 0 ? attempts[attempts.length - 1].createdAt : null;

        lines.push(
          [
            `"${sanitizeCSVValue(s.name ?? "")}"`,
            `"${sanitizeCSVValue(s.email ?? "")}"`,
            `"${sanitizeCSVValue(s.phone ?? "")}"`,
            `"${sanitizeCSVValue(s.group ?? "")}"`,
            `"${sanitizeCSVValue(s.university ?? "")}"`,
            new Date(s.createdAt).toLocaleDateString("ru-RU"),
            String(attempts.length),
            String(bestScore),
            String(avgScore),
            String(avgEc),
            String(avgBv),
            String(avgCorrectness),
            String(avgTime),
            lastAttempt ? new Date(lastAttempt).toLocaleDateString("ru-RU") : "Нет",
          ].join(";")
        );
      }
    }

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const buffer = Buffer.from(await blob.arrayBuffer());

    const filenames = {
      summary: "student-report-summary.csv",
      detailed: "student-report-detailed.csv",
      "at-risk": "student-report-at-risk.csv",
    };

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenames[exportType as keyof typeof filenames] || "student-report.csv"}"`,
      },
    });
  } catch (error) {
    logger.error("Export CSV failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
