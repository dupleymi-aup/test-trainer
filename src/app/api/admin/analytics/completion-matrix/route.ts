import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { withErrorHandler } from "@/lib/api-error-handler";

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    // Check cache
    const cacheKey = makeCacheKey("completion-matrix", { groupId });
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const usersInGroup = await db.userGroup.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const userIds = usersInGroup.map((u) => u.userId);

    if (userIds.length === 0) {
      return NextResponse.json({
        students: [],
        tasks: tasks.map((t) => ({ taskId: String(t.id), taskName: t.name, difficulty: t.difficulty })),
        matrix: {},
      });
    }

    const attempts = await db.attempt.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, taskId: true, score: true, createdAt: true },
    });

    const matrix: Record<string, Record<string, { bestScore: number; attemptsCount: number; lastAttempt: string }>> = {};
    attempts.forEach((a) => {
      if (!matrix[a.userId]) matrix[a.userId] = {};
      if (!matrix[a.userId][a.taskId]) matrix[a.userId][a.taskId] = { bestScore: 0, attemptsCount: 0, lastAttempt: "" };
      const cell = matrix[a.userId][a.taskId];
      cell.bestScore = Math.max(cell.bestScore, a.score);
      cell.attemptsCount++;
      const dateStr = a.createdAt.toISOString();
      if (!cell.lastAttempt || dateStr > cell.lastAttempt) cell.lastAttempt = dateStr;
    });

    const students = await db.user.findMany({
      where: { id: { in: userIds }, role: "STUDENT", deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });

    const result = {
      students,
      tasks: tasks.map((t) => ({ taskId: String(t.id), taskName: t.name, difficulty: t.difficulty })),
      matrix,
    };
    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
