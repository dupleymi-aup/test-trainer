import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

/**
 * Sanitize a value to prevent CSV injection attacks.
 * Excel/Calc can execute formulas if a cell starts with =, +, -, @.
 * Prefixing with a tab neutralizes these attacks while keeping data readable.
 */
function sanitizeCSVValue(value: string): string {
  if (value.startsWith("=") || value.startsWith("+") || value.startsWith("-") || value.startsWith("@")) {
    return "\t" + value;
  }
  return value;
}

export async function POST(req: Request) {
  const guard = await requireTeacherOrAdmin();
  if ("response" in guard) return guard.response;

  const body = await req.json();
  const { groupId, startDate, endDate } = body;

  // Build student query
  const where: Record<string, unknown> = {
    role: "STUDENT",
    deletedAt: null,
  };

  if (groupId) {
    where.groups = { some: { groupId } };
  }

  const students = await db.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      group: true,
      attempts: {
        where: {
          createdAt: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
        },
        select: {
          score: true,
          ecCoverage: true,
          bvCoverage: true,
          correctness: true,
          createdAt: true,
          taskId: true,
        },
      },
    },
  });

  // Generate CSV
  const lines: string[] = [];
  lines.push(["Имя", "Email", "Группа", "Попыток", "Лучший балл", "Ср. EC", "Ср. BV"].join(";"));

  for (const s of students) {
    const attempts = s.attempts;
    const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;
    const avgEc = attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.ecCoverage, 0) / attempts.length) : 0;
    const avgBv = attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.bvCoverage, 0) / attempts.length) : 0;

    lines.push(
      [
        `"${sanitizeCSVValue(s.name ?? "")}"`,
        `"${sanitizeCSVValue(s.email ?? "")}"`,
        `"${sanitizeCSVValue(s.group ?? "")}"`,
        String(bestScore),
        String(avgEc),
        String(avgBv),
      ].join(";")
    );
  }

  const csvContent = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const buffer = Buffer.from(await blob.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": 'attachment; filename="student-report.csv"',
    },
  });
}
