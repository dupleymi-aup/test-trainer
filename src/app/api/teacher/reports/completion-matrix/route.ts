import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";

export async function GET(req: Request) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 }
      );
    }

    // Get students in group
    const usersInGroup = await db.userGroup.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const userIds = usersInGroup.map((u) => u.userId);

    if (userIds.length === 0) {
      return NextResponse.json({
        students: [],
        tasks: tasks.map((t) => ({
          taskId: String(t.id),
          taskName: t.name,
          difficulty: t.difficulty,
        })),
        matrix: {},
      });
    }

    // Get attempts for these students
    const attempts = await db.attempt.findMany({
      where: {
        userId: { in: userIds },
      },
      select: {
        userId: true,
        taskId: true,
        score: true,
        createdAt: true,
      },
    });

    // Build matrix: studentId -> taskId -> { bestScore, attemptsCount, lastAttempt }
    const matrix: Record<
      string,
      Record<
        string,
        { bestScore: number; attemptsCount: number; lastAttempt: string }
      >
    > = {};

    attempts.forEach((a) => {
      if (!matrix[a.userId]) {
        matrix[a.userId] = {};
      }
      if (!matrix[a.userId][a.taskId]) {
        matrix[a.userId][a.taskId] = {
          bestScore: 0,
          attemptsCount: 0,
          lastAttempt: "",
        };
      }
      const cell = matrix[a.userId][a.taskId];
      cell.bestScore = Math.max(cell.bestScore, a.score);
      cell.attemptsCount++;
      const dateStr = a.createdAt.toISOString();
      if (!cell.lastAttempt || dateStr > cell.lastAttempt) {
        cell.lastAttempt = dateStr;
      }
    });

    // Get students
    const students = await db.user.findMany({
      where: {
        id: { in: userIds },
        role: "STUDENT",
        deletedAt: null,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Build task list
    const taskList = tasks.map((t) => ({
      taskId: String(t.id),
      taskName: t.name,
      difficulty: t.difficulty,
    }));

    return NextResponse.json({
      students,
      tasks: taskList,
      matrix,
    });
  } catch (error) {
    console.error("Completion matrix error:", error);
    return NextResponse.json(
      { error: "Failed to generate completion matrix" },
      { status: 500 }
    );
  }
}
