import { NextResponse } from "next/server";
import { requireTeacherOrAdmin, requireTeacherGroup } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireTeacherOrAdmin());

    const { searchParams } = new URL(req.url);
    const period1Start = searchParams.get("period1Start");
    const period1End = searchParams.get("period1End");
    const period2Start = searchParams.get("period2Start");
    const period2End = searchParams.get("period2End");
    const groupId = searchParams.get("groupId");

    // Require groupId to prevent teachers from accessing platform-wide data
    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    const groupCheck = await requireTeacherGroup(groupId, session);
    if ("response" in groupCheck) return groupCheck.response;

    // Get student IDs in this group
    const userGroups = await db.userGroup.findMany({
      where: { groupId: groupCheck.group.id },
      select: { userId: true },
    });
    const userIds = userGroups.map((u) => u.userId);

    if (!period1Start || !period1End) {
      // Default: compare last 30 days vs previous 30 days
      const now = new Date();
      const period2EndDefault = new Date(now);
      const period2StartDefault = new Date(now);
      period2StartDefault.setDate(period2StartDefault.getDate() - 30);

      const period1EndDefault = new Date(period2StartDefault);
      period1EndDefault.setDate(period1EndDefault.getDate() - 1);
      const period1StartDefault = new Date(period1EndDefault);
      period1StartDefault.setDate(period1StartDefault.getDate() - 30);

      return NextResponse.json({
        period1: { start: period1StartDefault, end: period1EndDefault },
        period2: { start: period2StartDefault, end: period2EndDefault },
        comparison: null,
        message: "No periods specified, using defaults",
      });
    }

    if (!period2Start || !period2End) {
      return NextResponse.json({ error: "Both period2Start and period2End are required" }, { status: 400 });
    }

    // Fetch attempts for both periods (scoped to group members)
    const [attempts1, attempts2] = await Promise.all([
      db.attempt.findMany({
        where: {
          userId: { in: userIds },
          createdAt: {
            gte: new Date(period1Start),
            lte: new Date(period1End),
          },
        },
        select: {
          userId: true,
          taskId: true,
          score: true,
          ecCoverage: true,
          bvCoverage: true,
          correctness: true,
          timeSpent: true,
        },
      }),
      db.attempt.findMany({
        where: {
          userId: { in: userIds },
          createdAt: {
            gte: new Date(period2Start),
            lte: new Date(period2End),
          },
        },
        select: {
          userId: true,
          taskId: true,
          score: true,
          ecCoverage: true,
          bvCoverage: true,
          correctness: true,
          timeSpent: true,
        },
      }),
    ]);

    // Calculate metrics for each period
    const calculateMetrics = (attempts: typeof attempts1) => {
      const totalAttempts = attempts.length;
      const uniqueStudents = new Set(attempts.map((a) => a.userId)).size;
      const avgScore =
        totalAttempts > 0
          ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / totalAttempts)
          : 0;
      const avgEc =
        totalAttempts > 0
          ? Math.round(
              attempts.reduce((s, a) => s + a.ecCoverage, 0) / totalAttempts
            )
          : 0;
      const avgBv =
        totalAttempts > 0
          ? Math.round(
              attempts.reduce((s, a) => s + a.bvCoverage, 0) / totalAttempts
            )
          : 0;
      const avgCorrectness =
        totalAttempts > 0
          ? Math.round(
              attempts.reduce((s, a) => s + a.correctness, 0) / totalAttempts
            )
          : 0;
      const avgTime =
        totalAttempts > 0
          ? Math.round(
              attempts.reduce((s, a) => s + a.timeSpent, 0) / totalAttempts
            )
          : 0;

      // Task breakdown
      const taskScores: Record<string, number[]> = {};
      attempts.forEach((a) => {
        if (!taskScores[a.taskId]) taskScores[a.taskId] = [];
        taskScores[a.taskId].push(a.score);
      });

      const taskPerformance = Object.entries(taskScores).map(
        ([taskId, scores]) => ({
          taskId,
          avgScore: Math.round(
            scores.reduce((s, v) => s + v, 0) / scores.length
          ),
          attemptsCount: scores.length,
        })
      );

      // Topic analysis
      const taskMap = new Map(
        tasks.map((t) => [String(t.id), t.topics])
      );
      const topicScores: Record<string, number[]> = {};
      attempts.forEach((a) => {
        const topics = taskMap.get(a.taskId);
        if (topics) {
          topics.forEach((topic) => {
            if (!topicScores[topic]) topicScores[topic] = [];
            topicScores[topic].push(a.score);
          });
        }
      });

      const topicPerformance = Object.entries(topicScores).map(
        ([topic, scores]) => ({
          topic,
          avgScore: Math.round(
            scores.reduce((s, v) => s + v, 0) / scores.length
          ),
        })
      );

      return {
        totalAttempts,
        uniqueStudents,
        avgScore,
        avgEc,
        avgBv,
        avgCorrectness,
        avgTime,
        taskPerformance,
        topicPerformance,
      };
    };

    const period1Metrics = calculateMetrics(attempts1);
    const period2Metrics = calculateMetrics(attempts2);

    // Calculate changes
    const calculateChange = (val1: number, val2: number) => {
      if (val1 === 0) return val2 > 0 ? 100 : 0;
      return Math.round(((val2 - val1) / val1) * 100);
    };

    const comparison = {
      attempts: {
        period1: period1Metrics.totalAttempts,
        period2: period2Metrics.totalAttempts,
        change: calculateChange(
          period1Metrics.totalAttempts,
          period2Metrics.totalAttempts
        ),
      },
      students: {
        period1: period1Metrics.uniqueStudents,
        period2: period2Metrics.uniqueStudents,
        change: calculateChange(
          period1Metrics.uniqueStudents,
          period2Metrics.uniqueStudents
        ),
      },
      avgScore: {
        period1: period1Metrics.avgScore,
        period2: period2Metrics.avgScore,
        change: period2Metrics.avgScore - period1Metrics.avgScore,
      },
      avgEc: {
        period1: period1Metrics.avgEc,
        period2: period2Metrics.avgEc,
        change: period2Metrics.avgEc - period1Metrics.avgEc,
      },
      avgBv: {
        period1: period1Metrics.avgBv,
        period2: period2Metrics.avgBv,
        change: period2Metrics.avgBv - period1Metrics.avgBv,
      },
    };

    return NextResponse.json({
      period1: { start: period1Start, end: period1End },
      period2: { start: period2Start, end: period2End },
      period1Metrics,
      period2Metrics,
      comparison,
    });
  });
}
