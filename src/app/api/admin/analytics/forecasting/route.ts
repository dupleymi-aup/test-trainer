import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { predictNextScore } from "@/lib/risk-analysis";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

export async function GET(req: NextRequest) {
  return withErrorHandler(req, async () => {
    unwrapGuard(await requireAdmin());

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const university = searchParams.get("university");

    const cacheKey = makeCacheKey("forecasting", { groupId: groupId || "", university: university || "" });
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Find students
    let studentIds: string[] = [];
    if (groupId) {
      const group = await db.group.findUnique({
        where: { id: groupId },
        select: { members: { select: { userId: true } } },
      });
      if (group) studentIds = group.members.map((m) => m.userId);
    } else if (university) {
      const students = await db.user.findMany({
        where: { university, role: "STUDENT", deletedAt: null },
        select: { id: true },
      });
      studentIds = students.map((s) => s.id);
    } else {
      const allStudents = await db.user.findMany({
        where: { role: "STUDENT", deletedAt: null },
        select: { id: true },
      });
      studentIds = allStudents.map((s) => s.id);
    }

    // Batch fetch attempts
    const attempts = await db.attempt.findMany({
      where: { userId: { in: studentIds } },
      take: 50_000,
      orderBy: [{ userId: "asc" }, { createdAt: "asc" }],
    });

    // Group by student
    const byStudent: Record<string, { score: number; createdAt: Date }[]> = {};
    for (const a of attempts) {
      if (!byStudent[a.userId]) byStudent[a.userId] = [];
      byStudent[a.userId].push({ score: a.score, createdAt: a.createdAt });
    }

    // Fetch student info
    const students = await db.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, group: true, university: true },
    });

    const studentMap = new Map(students.map((s) => [s.id, s]));

    const forecasts = studentIds
      .map((id) => {
        const student = studentMap.get(id);
        const studentAttempts = byStudent[id] || [];
        if (studentAttempts.length < 3) return null;

        const prediction = predictNextScore(studentAttempts);
        if (!prediction) return null;

        const currentAvg = Math.round(
          studentAttempts.reduce((s, a) => s + a.score, 0) / studentAttempts.length
        );

        return {
          studentId: id,
          name: student?.name || "Unknown",
          group: student?.group || "",
          university: student?.university || "",
          currentAvg,
          predictedNext: Math.round(prediction.predicted),
          confidence: prediction.confidence,
          confidenceLevel: prediction.confidence >= 70 ? "high" : prediction.confidence >= 40 ? "medium" : "low",
          trend: prediction.trend,
        };
      })
      .filter(Boolean);

    const result = { forecasts, totalStudents: studentIds.length, forecastedCount: forecasts.length };
    setCache(cacheKey, result, DEFAULT_TTL.medium);
    return NextResponse.json(result);
  });
}
