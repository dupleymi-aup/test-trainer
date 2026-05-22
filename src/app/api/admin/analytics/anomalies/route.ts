import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { computeAnomalyFlags } from "@/lib/risk-analysis";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const university = searchParams.get("university");

    const cacheKey = makeCacheKey("anomalies", { groupId: groupId || "", university: university || "" });
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

    // Compute avg time per task across all students
    const taskTimeMap: Record<string, number[]> = {};
    for (const a of attempts) {
      if (!taskTimeMap[a.taskId]) taskTimeMap[a.taskId] = [];
      taskTimeMap[a.taskId].push(a.timeSpent);
    }
    const avgTimePerTask: Record<number, number> = {};
    for (const [taskId, times] of Object.entries(taskTimeMap)) {
      avgTimePerTask[Number(taskId)] = times.reduce((s, v) => s + v, 0) / times.length;
    }

    // Group attempts by student
    const byStudent: Record<string, { score: number; timeSpent: number; testId?: number; taskId: string; createdAt: Date }[]> = {};
    for (const a of attempts) {
      if (!byStudent[a.userId]) byStudent[a.userId] = [];
      byStudent[a.userId].push({
        score: a.score,
        timeSpent: a.timeSpent,
        taskId: a.taskId,
        createdAt: a.createdAt,
      });
    }

    // Fetch student info
    const students = await db.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, group: true },
    });
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const allAnomalies: ReturnType<typeof computeAnomalyFlags> = [];
    for (const id of studentIds) {
      const student = studentMap.get(id);
      const studentAttempts = byStudent[id] || [];
      if (studentAttempts.length < 2) continue;

      const flags = computeAnomalyFlags(
        id,
        student?.name || "Unknown",
        student?.group || "",
        studentAttempts,
        avgTimePerTask
      );
      allAnomalies.push(...flags);
    }

    // Sort by severity then timestamp
    const severityOrder = { high: 0, medium: 1, low: 2 };
    allAnomalies.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Summary by type
    const byType: Record<string, number> = {};
    for (const a of allAnomalies) {
      byType[a.anomalyType] = (byType[a.anomalyType] || 0) + 1;
    }

    const result = {
      anomalies: allAnomalies,
      summary: { total: allAnomalies.length, byType },
    };

    setCache(cacheKey, result, DEFAULT_TTL.medium);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to fetch anomalies", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch anomalies" }, { status: 500 });
  }
}
