import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logger";

const saveExamSchema = z.object({
  taskIds: z.array(z.number().int().positive()).min(1),
  timeLimit: z.number().int().positive(),
  mode: z.enum(["exam", "practice"]),
  avgScore: z.number().int().min(0).max(100),
  bestTaskId: z.number().int().positive().nullable().optional(),
  bestTaskScore: z.number().int().min(0).max(100),
  worstTaskId: z.number().int().positive().nullable().optional(),
  worstTaskScore: z.number().int().min(0).max(100),
  totalCorrectness: z.number().int().min(0).max(100),
  timeSpent: z.number().int().positive(),
  results: z.record(z.string(), z.number()),
});

export async function GET(req: Request) {
  try {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));

    const [exams, total] = await Promise.all([
      db.studentExam.findMany({
        where: { userId: auth.session.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: (page - 1) * 20,
        select: {
          id: true,
          taskIds: true,
          timeLimit: true,
          mode: true,
          avgScore: true,
          bestTaskScore: true,
          worstTaskScore: true,
          timeSpent: true,
          createdAt: true,
        },
      }),
      db.studentExam.count({ where: { userId: auth.session.userId } }),
    ]);

    return NextResponse.json({ exams, total, page });
  } catch (error) {
    logger.error("Failed to fetch exam history", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch exam history" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const parsed = saveExamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
    }

    const exam = await db.studentExam.create({
      data: {
        userId: auth.session.userId,
        taskIds: JSON.stringify(parsed.data.taskIds),
        timeLimit: parsed.data.timeLimit,
        mode: parsed.data.mode,
        avgScore: parsed.data.avgScore,
        bestTaskId: parsed.data.bestTaskId ?? null,
        bestTaskScore: parsed.data.bestTaskScore,
        worstTaskId: parsed.data.worstTaskId ?? null,
        worstTaskScore: parsed.data.worstTaskScore,
        totalCorrectness: parsed.data.totalCorrectness,
        timeSpent: parsed.data.timeSpent,
        results: JSON.stringify(parsed.data.results),
      },
    });

    return NextResponse.json({ exam }, { status: 201 });
  } catch (error) {
    logger.error("Failed to save exam result", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to save exam result" }, { status: 500 });
  }
}
