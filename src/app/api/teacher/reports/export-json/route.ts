import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { formatZodError, parseRequestBody, withErrorHandler } from "@/lib/api-error-handler";

const exportJsonSchema = z.object({
  groupId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`teacherReportExport:${ip}`, rateLimits.teacherReportExport);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const bodyResult = await parseRequestBody(req, exportJsonSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { groupId, startDate, endDate } = bodyResult.data;

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
          select: {
            id: true,
            taskId: true,
            score: true,
            ecCoverage: true,
            bvCoverage: true,
            correctness: true,
            timeSpent: true,
            testCases: true,
            coveredEcIds: true,
            coveredBvDescriptions: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Enrich with stats
    const studentsWithStats = students.map((student) => {
      const attempts = student.attempts;
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

      // Parse testCases and covered data from JSON strings
      const parsedAttempts = attempts.map((a) => {
        let testCases: unknown[] = [];
        let coveredEcIds: string[] = [];
        let coveredBvDescriptions: string[] = [];

        try {
          testCases = JSON.parse(a.testCases || "[]");
        } catch {
          logger.warn("Failed to parse testCases for attempt", { attemptId: a.id });
        }
        try {
          coveredEcIds = JSON.parse(a.coveredEcIds || "[]");
        } catch {
          logger.warn("Failed to parse coveredEcIds for attempt", { attemptId: a.id });
        }
        try {
          coveredBvDescriptions = JSON.parse(a.coveredBvDescriptions || "[]");
        } catch {
          logger.warn("Failed to parse coveredBvDescriptions for attempt", { attemptId: a.id });
        }

        return {
          ...a,
          testCases,
          coveredEcIds,
          coveredBvDescriptions,
          createdAt: a.createdAt.toISOString(),
        };
      });

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        group: student.group,
        university: student.university,
        registeredAt: student.createdAt.toISOString(),
        stats: {
          totalAttempts: attempts.length,
          bestScore,
          avgScore,
          avgEc,
          avgBv,
        },
        attempts: parsedAttempts,
      };
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      filters: {
        groupId: groupId || null,
        startDate: startDate || null,
        endDate: endDate || null,
      },
      students: studentsWithStats,
      summary: {
        totalStudents: studentsWithStats.length,
        totalAttempts: studentsWithStats.reduce(
          (s, st) => s + st.stats.totalAttempts,
          0
        ),
        avgBestScore:
          studentsWithStats.length > 0
            ? Math.round(
                studentsWithStats.reduce((s, st) => s + st.stats.bestScore, 0) /
                  studentsWithStats.length
              )
            : 0,
      },
    };

    db.activityLog.create({
      data: {
        userId: session.userId,
        action: "EXPORT_REPORT",
        entity: "Report",
        details: JSON.stringify({ reportType: "detailed", format: "json", groupId, startDate, endDate }),
        ipAddress: ip,
      },
    }).catch((e) => { logger.warn("Failed to log export activity", { error: String(e) }); });

    return NextResponse.json(exportData);
  });
}
