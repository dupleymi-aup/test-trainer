import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      role: "STUDENT",
      deletedAt: null,
    };

    if (groupId) {
      where.groups = { some: { groupId } };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const students = await db.user.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        university: true,
        group: true,
        createdAt: true,
        attempts: {
          select: { score: true, ecCoverage: true, bvCoverage: true, createdAt: true },
        },
      },
    });

    // Enrich with progress stats (no N+1 — attempts already loaded)
    const studentsWithStats = students.map((student) => {
      const attempts = student.attempts;
      const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;
      const avgEc = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.ecCoverage, 0) / attempts.length) : 0;
      const avgBv = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.bvCoverage, 0) / attempts.length) : 0;
      const sorted = [...attempts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const lastAttempt = sorted.length > 0 ? sorted[0].createdAt : null;

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        university: student.university,
        group: student.group,
        createdAt: student.createdAt,
        bestScore,
        avgEc,
        avgBv,
        lastAttempt,
        attemptsCount: attempts.length,
      };
    });

    return NextResponse.json({ students: studentsWithStats });
  } catch (error) {
    logger.error("Failed to fetch students", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}
