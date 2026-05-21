import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const guard = await requireTeacherOrAdmin();
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Build user filter
  let userIds: string[] | undefined;
  if (groupId) {
    const usersInGroup = await db.userGroup.findMany({
      where: { groupId },
      select: { userId: true },
    });
    userIds = usersInGroup.map((u) => u.userId);
  }

  // Fetch all students with attempts
  const students = await db.user.findMany({
    where: {
      id: userIds ? { in: userIds } : undefined,
      role: "STUDENT",
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
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
        orderBy: { createdAt: "asc" },
        select: {
          score: true,
          ecCoverage: true,
          bvCoverage: true,
          correctness: true,
          createdAt: true,
        },
      },
    },
  });

  // Calculate trend: compare first 5 vs last 5 attempts
  const calculateTrend = (
    attempts: Array<{ score: number }>
  ): "improving" | "stable" | "declining" => {
    if (attempts.length < 6) return "stable";
    const first5 = attempts.slice(0, 5);
    const last5 = attempts.slice(-5);
    const firstAvg = first5.reduce((s, a) => s + a.score, 0) / first5.length;
    const lastAvg = last5.reduce((s, a) => s + a.score, 0) / last5.length;
    const delta = lastAvg - firstAvg;
    if (delta > 10) return "improving";
    if (delta < -10) return "declining";
    return "stable";
  };

  // Group students by their group field
  const groupsMap: Record<
    string,
    Array<{
      id: string;
      name: string | null;
      email: string | null;
      group: string | null;
      university: string | null;
      bestScore: number;
      avgScore: number;
      avgEc: number;
      avgBv: number;
      attemptsCount: number;
      lastAttemptDate: string | null;
      trend: "improving" | "stable" | "declining";
    }>
  > = {};

  students.forEach((student) => {
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
    const lastAttemptDate =
      attempts.length > 0
        ? attempts[attempts.length - 1].createdAt.toISOString()
        : null;
    const trend = calculateTrend(attempts);

    const groupName = student.group || "Без группы";
    if (!groupsMap[groupName]) {
      groupsMap[groupName] = [];
    }

    groupsMap[groupName].push({
      id: student.id,
      name: student.name,
      email: student.email,
      group: student.group,
      university: student.university,
      bestScore,
      avgScore,
      avgEc,
      avgBv,
      attemptsCount: attempts.length,
      lastAttemptDate,
      trend,
    });
  });

  // Build response
  const groups = Object.entries(groupsMap).map(([groupName, students]) => {
    const activeThreshold = new Date();
    activeThreshold.setDate(activeThreshold.getDate() - 30);

    return {
      groupName,
      studentCount: students.length,
      avgBestScore:
        students.length > 0
          ? Math.round(
              students.reduce((s, st) => s + st.bestScore, 0) / students.length
            )
          : 0,
      avgEc:
        students.length > 0
          ? Math.round(
              students.reduce((s, st) => s + st.avgEc, 0) / students.length
            )
          : 0,
      avgBv:
        students.length > 0
          ? Math.round(
              students.reduce((s, st) => s + st.avgBv, 0) / students.length
            )
          : 0,
      totalAttempts: students.reduce((s, st) => s + st.attemptsCount, 0),
      activeStudents: students.filter(
        (s) =>
          s.lastAttemptDate && new Date(s.lastAttemptDate) > activeThreshold
      ).length,
      inactiveStudents: students.filter(
        (s) =>
          !s.lastAttemptDate || new Date(s.lastAttemptDate) <= activeThreshold
      ).length,
      students,
    };
  });

  return NextResponse.json({ groups });
}
