import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { computeStudentStats, computeStudentRisk } from "@/lib/risk-analysis";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const group = searchParams.get("group") || "";
  const university = searchParams.get("university") || "";
  const riskLevel = searchParams.get("riskLevel") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch all students with attempts
  const whereClause: Record<string, unknown> = { role: "STUDENT", deletedAt: null };
  if (group) whereClause.group = group;
  if (university) whereClause.university = university;

  const students = await db.user.findMany({
    where: whereClause,
    select: {
      id: true, name: true, email: true, group: true, university: true, createdAt: true,
      attempts: { select: { score: true, ecCoverage: true, bvCoverage: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });

  // Filter by search
  let filtered = students;
  if (search) {
    const lower = search.toLowerCase();
    filtered = students.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(lower) ||
        (s.email || "").toLowerCase().includes(lower)
    );
  }

  // Compute risk for each student
  const enriched = filtered.map((s) => {
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

  // Filter by risk level
  let riskFiltered = enriched;
  if (riskLevel && riskLevel !== "none") {
    riskFiltered = enriched.filter((s) => s.riskLevel === riskLevel);
  } else if (riskLevel === "none") {
    riskFiltered = enriched.filter((s) => s.riskLevel === "none");
  }

  // Pagination
  const total = riskFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const paginated = riskFiltered.slice(start, start + limit);

  return NextResponse.json({
    students: paginated,
    pagination: { page, limit, total, totalPages },
  });
  } catch (error) {
    logger.error("students-report-route failed", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
