import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { withErrorHandler } from "@/lib/api-error-handler";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(_req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const { id } = await params;

  // Check cache
  const cacheKey = makeCacheKey("group-detail", { id });
  const cached = getCache(cacheKey);
  if (cached) return NextResponse.json(cached);

  const group = await db.group.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, email: true } },
      members: {
        include: {
          user: {
            select: {
              id: true, name: true, email: true, university: true, createdAt: true,
              attempts: { select: { taskId: true, userId: true, score: true, ecCoverage: true, bvCoverage: true, createdAt: true, timeSpent: true } },
            },
          },
        },
      },
      assignedTasks: { select: { taskId: true } },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const taskMap = new Map(
    tasks.map((t) => [String(t.id), { name: t.name, difficulty: t.difficulty }])
  );

  // Members with stats
  const members = group.members.map((m) => {
    const attempts = m.user.attempts;
    const bestScore = attempts.reduce((max, a) => Math.max(max, a.score), 0);
    const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0;

    // Trend
    let trend: "improving" | "stable" | "declining" = "stable";
    if (attempts.length >= 6) {
      const first5 = attempts.slice(0, 5);
      const last5 = attempts.slice(-5);
      const firstAvg = first5.reduce((s, a) => s + a.score, 0) / first5.length;
      const lastAvg = last5.reduce((s, a) => s + a.score, 0) / last5.length;
      const delta = lastAvg - firstAvg;
      if (delta > 10) trend = "improving";
      else if (delta < -10) trend = "declining";
    }

    const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isActive = lastAttempt ? lastAttempt.createdAt >= thirtyDaysAgo : false;

    return {
      id: m.user.id, name: m.user.name || m.user.email || "Unknown",
      email: m.user.email || "", university: m.user.university || "",
      createdAt: m.user.createdAt.toISOString(),
      stats: {
        bestScore, avgScore, attemptsCount: attempts.length,
        lastAttemptDate: lastAttempt?.createdAt.toISOString() || null,
        isActive, trend,
      },
    };
  });

  // Task completion matrix
  const allTaskIds = new Set<string>();
  members.forEach((m) => {
    const memberData = group.members.find((gm) => gm.user.id === m.id);
    memberData?.user.attempts.forEach((a) => allTaskIds.add(a.taskId));
  });

  const taskCompletionMatrix = Array.from(allTaskIds).map((taskId) => {
    const meta = taskMap.get(taskId);
    const memberAttempts = group.members.flatMap((gm) =>
      gm.user.attempts.filter((a) => a.taskId === taskId)
    );
    const uniqueMembers = new Set(memberAttempts.map((a) => a.userId)).size;
    const completedCount = memberAttempts.length;
    const avgScore = memberAttempts.length > 0
      ? Math.round(memberAttempts.reduce((s, a) => s + a.score, 0) / memberAttempts.length)
      : 0;
    const bestScore = memberAttempts.reduce((max, a) => Math.max(max, a.score), 0);
    const completionRate = group.members.length > 0
      ? Math.round((uniqueMembers / group.members.length) * 100)
      : 0;

    return {
      taskId, taskName: meta?.name || `Задание ${taskId}`,
      difficulty: meta?.difficulty || "Unknown",
      completedCount, avgScore, bestScore, completionRate,
    };
  });

  // Performance distribution
  const allScores = group.members.flatMap((gm) => gm.user.attempts.map((a) => a.score));
  const performanceDistribution: Record<string, number> = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
  allScores.forEach((s) => {
    if (s <= 20) performanceDistribution["0-20"]++;
    else if (s <= 40) performanceDistribution["21-40"]++;
    else if (s <= 60) performanceDistribution["41-60"]++;
    else if (s <= 80) performanceDistribution["61-80"]++;
    else performanceDistribution["81-100"]++;
  });

  // Task comparison: group avg vs platform avg
  const allPlatformAttempts = await db.attempt.findMany({
    select: { taskId: true, score: true, ecCoverage: true, bvCoverage: true },
  });

  const platformTaskData: Record<string, number[]> = {};
  allPlatformAttempts.forEach((a) => {
    if (!platformTaskData[a.taskId]) platformTaskData[a.taskId] = [];
    platformTaskData[a.taskId].push(a.score);
  });

  const taskComparison = taskCompletionMatrix.map((tc) => {
    const memberAttemptsForTask = group.members.flatMap((gm) =>
      gm.user.attempts.filter((a) => a.taskId === tc.taskId)
    );
    const groupAvgScore = memberAttemptsForTask.length > 0
      ? Math.round(memberAttemptsForTask.reduce((s, a) => s + a.score, 0) / memberAttemptsForTask.length)
      : 0;
    const groupAvgEc = memberAttemptsForTask.length > 0
      ? Math.round(memberAttemptsForTask.reduce((s, a) => s + a.ecCoverage, 0) / memberAttemptsForTask.length)
      : 0;
    const groupAvgBv = memberAttemptsForTask.length > 0
      ? Math.round(memberAttemptsForTask.reduce((s, a) => s + a.bvCoverage, 0) / memberAttemptsForTask.length)
      : 0;
    const platformScores = platformTaskData[tc.taskId] || [];
    const platformAvgScore = platformScores.length > 0
      ? Math.round(platformScores.reduce((s, v) => s + v, 0) / platformScores.length)
      : 0;

    return {
      taskId: tc.taskId, taskName: tc.taskName,
      groupAvgScore, groupAvgEc, groupAvgBv, platformAvgScore,
    };
  });

  // Activity timeline (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const groupMemberIds = new Set(group.members.map((m) => m.user.id));
  const groupAttempts = await db.attempt.findMany({
    where: { userId: { in: Array.from(groupMemberIds) }, createdAt: { gte: thirtyDaysAgo } },
    select: { userId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const dailyMap: Record<string, { attemptsCount: number; uniqueStudents: Set<string> }> = {};
  for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split("T")[0];
    dailyMap[key] = { attemptsCount: 0, uniqueStudents: new Set() };
  }
  groupAttempts.forEach((a) => {
    const key = a.createdAt.toISOString().split("T")[0];
    if (dailyMap[key]) {
      dailyMap[key].attemptsCount++;
      dailyMap[key].uniqueStudents.add(a.userId);
    }
  });

  const activityTimeline = Object.entries(dailyMap).map(([date, data]) => ({
    date, attemptsCount: data.attemptsCount, uniqueStudents: data.uniqueStudents.size,
  }));

  // Summary
  const totalMembers = group.members.length;
  const activeMembers = members.filter((m) => m.stats.isActive).length;
  const totalAttempts = allScores.length;
  const avgGroupScore = allScores.length > 0 ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length) : 0;
  const avgEc = allScores.length > 0
    ? Math.round(group.members.flatMap((gm) => gm.user.attempts.map((a) => a.ecCoverage)).reduce((s, v) => s + v, 0) / Math.max(1, group.members.flatMap((gm) => gm.user.attempts).length))
    : 0;
  const avgBv = allScores.length > 0
    ? Math.round(group.members.flatMap((gm) => gm.user.attempts.map((a) => a.bvCoverage)).reduce((s, v) => s + v, 0) / Math.max(1, group.members.flatMap((gm) => gm.user.attempts).length))
    : 0;
  const tasksAssigned = group.assignedTasks.length;
  const tasksCompleted = taskCompletionMatrix.filter((t) => t.completedCount > 0).length;

  const result = {
    group: {
      id: group.id, name: group.name, description: group.description || "",
      createdBy: group.createdBy ? { name: group.createdBy.name || "", email: group.createdBy.email || "" } : null,
      createdAt: group.createdAt.toISOString(), updatedAt: group.updatedAt.toISOString(),
    },
    members,
    taskCompletionMatrix,
    performanceDistribution,
    taskComparison,
    activityTimeline,
    summary: { totalMembers, activeMembers, totalAttempts, avgGroupScore, avgEc, avgBv, tasksAssigned, tasksCompleted },
  };

    setCache(cacheKey, result, DEFAULT_TTL.expensive);
    return NextResponse.json(result);
  });
}
