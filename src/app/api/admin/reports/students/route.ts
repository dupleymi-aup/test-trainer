import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { computeStudentStats, computeStudentRisk } from "@/lib/risk-analysis";
import { withErrorHandler } from "@/lib/api-error-handler";
import { parseSearchParams } from "@/lib/api-error-handler";
import { paginationSchema, searchParamsSchema } from "@/lib/shared-schemas";
import { z } from "zod";

const studentsParamsSchema = paginationSchema.merge(searchParamsSchema).extend({
  group: z.string().default(""),
  university: z.string().default(""),
  riskLevel: z.enum(["high", "medium", "low", "none", ""]).default(""),
});

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

  const params = parseSearchParams(req, studentsParamsSchema);
  if (!params.success) return params.errorResponse;
  const { search, group, university, riskLevel, page, limit } = params.data;

  // Build base where clause for count query (without pagination)
  const countWhere: Record<string, unknown> = { role: "STUDENT", deletedAt: null };
  if (group) countWhere.group = group;
  if (university) countWhere.university = university;
  if (search) {
    countWhere.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  // Get total count
  const total = await db.user.count({ where: countWhere });

  // Fetch students with database-level pagination
  const skip = (page - 1) * limit;
  const students = await db.user.findMany({
    where: countWhere,
    skip,
    take: limit,
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, email: true, group: true, university: true, createdAt: true,
      attempts: { select: { score: true, ecCoverage: true, bvCoverage: true, createdAt: true }, orderBy: { createdAt: "asc" }, take: 100 },
    },
  });

  // Compute risk for each student
  const enriched = students.map((s) => {
    const attemptsData = s.attempts.map((a) => ({
      score: a.score, ecCoverage: a.ecCoverage, bvCoverage: a.bvCoverage, createdAt: a.createdAt,
    }));
    const stats = computeStudentStats(attemptsData);
    const risk = computeStudentRisk(attemptsData, s.createdAt);

    let riskLevelValue: "high" | "medium" | "low" | "none" = "none";
    if (risk.riskFactors.length >= 3) riskLevelValue = "high";
    else if (risk.riskFactors.length >= 2) riskLevelValue = "medium";
    else if (risk.riskFactors.length >= 1) riskLevelValue = "low";

    return {
      id: s.id, name: s.name || s.email || "Unknown", email: s.email || "",
      group: s.group || "", university: s.university || "",
      stats: {
        bestScore: stats.bestScore, avgScore: stats.avgScore,
        attemptsCount: stats.totalAttempts,
        lastAttemptDate: s.attempts.length > 0 ? s.attempts[s.attempts.length - 1].createdAt.toISOString() : null,
      },
      riskLevel: riskLevelValue,
      trend: risk.trend,
    };
  });

  // Client-side risk filter (applied after DB pagination)
  let paginated = enriched;
  if (riskLevel && riskLevel !== "none") {
    paginated = enriched.filter((s) => s.riskLevel === riskLevel);
  } else if (riskLevel === "none") {
    paginated = enriched.filter((s) => s.riskLevel === "none");
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json({
    students: paginated,
    pagination: { page, limit, total, totalPages },
  });
  });
}
