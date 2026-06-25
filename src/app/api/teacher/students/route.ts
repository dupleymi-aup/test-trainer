import { NextResponse } from "next/server";
import { requireTeacherOrAdmin, requireTeacherGroup } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { parseSearchParams, withErrorHandler } from "@/lib/api-error-handler";
import { z } from "zod";

const studentsParamsSchema = z.object({
  groupId: z.string().min(1),
  search: z.string().optional(),
});

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const params = parseSearchParams(req, studentsParamsSchema);
    if (!params.success) return params.errorResponse;
    const { groupId, search } = params.data;

    const groupCheck = await requireTeacherGroup(groupId, session);
    if ("response" in groupCheck) return groupCheck.response;

    const where: Record<string, unknown> = {
      role: "STUDENT",
      deletedAt: null,
      groups: { some: { groupId: groupCheck.group.id } },
    };

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
          take: 100,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Enrich with progress stats (no N+1 — attempts already loaded)
    const studentsWithStats = students.map((student) => {
      const attempts = student.attempts;
      const bestScore = attempts.reduce((max, a) => Math.max(max, a.score), 0);
      const avgEc = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.ecCoverage, 0) / attempts.length) : 0;
      const avgBv = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.bvCoverage, 0) / attempts.length) : 0;
      const lastAttempt = attempts.length > 0 ? attempts[0].createdAt : null;

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
  });
}
