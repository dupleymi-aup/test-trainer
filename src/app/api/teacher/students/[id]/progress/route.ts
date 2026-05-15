import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireTeacherOrAdmin();
  if ("response" in guard) return guard.response;

  const { id } = await params;

  const student = await db.user.findUnique({
    where: { id, role: "STUDENT" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      university: true,
      group: true,
      createdAt: true,
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const attempts = await db.attempt.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Parse testCases from JSON for each attempt
  const parsedAttempts = attempts.map((a) => ({
    ...a,
    testCases: JSON.parse(a.testCases),
    coveredEcIds: JSON.parse(a.coveredEcIds),
    coveredBvDescriptions: JSON.parse(a.coveredBvDescriptions),
  }));

  // Compute stats
  const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;
  const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0;
  const avgEc = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.ecCoverage, 0) / attempts.length) : 0;
  const avgBv = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.bvCoverage, 0) / attempts.length) : 0;

  // Scores over time
  const scoresOverTime = attempts
    .slice()
    .reverse()
    .map((a) => ({
      date: a.createdAt.toISOString(),
      score: a.score,
      ecCoverage: a.ecCoverage,
      bvCoverage: a.bvCoverage,
    }));

  return NextResponse.json({
    student,
    stats: { bestScore, avgScore, avgEc, avgBv, totalAttempts: attempts.length },
    attempts: parsedAttempts,
    scoresOverTime,
  });
}
