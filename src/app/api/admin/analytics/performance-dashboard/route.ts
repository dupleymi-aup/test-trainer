import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { batchComputeStudentRisk, AttemptData } from "@/lib/risk-analysis";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const groupId = searchParams.get("groupId");
    const university = searchParams.get("university");
    const sortBy = searchParams.get("sortBy") || "avgScore";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const cacheKey = makeCacheKey("performance-dashboard", { page, limit, search, groupId: groupId || "", university: university || "", sortBy, sortOrder });
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Build student filter
    const whereClause: Record<string, unknown> = { role: "STUDENT", deletedAt: null };
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (groupId) {
      whereClause.group = groupId;
    }
    if (university) {
      whereClause.university = university;
    }

    const students = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        group: true,
        university: true,
        createdAt: true,
        attempts: {
          select: {
            score: true,
            ecCoverage: true,
            bvCoverage: true,
            correctness: true,
            timeSpent: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    // Use shared risk analysis library
    const riskMap = batchComputeStudentRisk(
      students.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        attempts: s.attempts.map((a) => ({
          score: a.score,
          ecCoverage: a.ecCoverage,
          bvCoverage: a.bvCoverage,
          createdAt: a.createdAt,
        })) as AttemptData[],
      }))
    );

    const studentData = students.map((s) => {
      const attempts = s.attempts;
      const riskResult = riskMap.get(s.id);
      const stats = riskResult?.stats;
      const risk = riskResult?.risk;

      const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
      const lastAttemptDate = lastAttempt?.createdAt.toISOString().split("T")[0] || null;
      const attemptsLast7Days = attempts.filter((a) => a.createdAt >= sevenDaysAgo).length;

      return {
        studentId: s.id,
        name: s.name || s.email || "Unknown",
        group: s.group || "",
        university: s.university || "",
        registeredAt: s.createdAt.toISOString().split("T")[0],
        metrics: {
          avgScore: stats?.avgScore ?? 0,
          bestScore: stats?.bestScore ?? 0,
          avgEc: stats?.avgEc ?? 0,
          avgBv: stats?.avgBv ?? 0,
          totalAttempts: stats?.totalAttempts ?? 0,
          attemptsLast7Days,
          lastAttemptDate,
          trend: risk?.trend ?? "stable",
          riskLevel: risk?.dropoutRisk ?? "low",
          riskScore: risk ? risk.riskFactors.length + (risk.trend === "declining" ? 1 : 0) + (stats && stats.bestScore < 30 ? 1 : 0) : 0,
        },
      };
    });

    // Sort
    const sortFn = (a: any, b: any) => {
      const key = sortBy as keyof typeof a.metrics;
      const aVal = a.metrics[key];
      const bVal = b.metrics[key];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    };
    studentData.sort(sortFn);

    // Paginate
    const total = studentData.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = studentData.slice(start, start + limit);

    // Summary stats
    const summary = {
      totalStudents: total,
      avgScore: total > 0 ? Math.round(studentData.reduce((s, d) => s + d.metrics.avgScore, 0) / total) : 0,
      highRisk: studentData.filter((d) => d.metrics.riskLevel === "high").length,
      mediumRisk: studentData.filter((d) => d.metrics.riskLevel === "medium").length,
      lowRisk: studentData.filter((d) => d.metrics.riskLevel === "low").length,
      activeLast7Days: studentData.filter((d) => d.metrics.attemptsLast7Days > 0).length,
      inactive: studentData.filter((d) => d.metrics.totalAttempts === 0).length,
    };

    const result = { students: paginated, summary, pagination: { page, limit, total, totalPages } };
    setCache(cacheKey, result, DEFAULT_TTL.medium);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to fetch performance dashboard", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch performance dashboard" }, { status: 500 });
  }
}
