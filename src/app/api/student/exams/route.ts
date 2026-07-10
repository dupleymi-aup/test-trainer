import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseRequestBody, withErrorHandler } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";

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
  return withErrorHandler(req, async () => {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

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
  });
}

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`studentExamSubmit:${ip}`, rateLimits.studentExamSubmit);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const bodyResult = await parseRequestBody(req, saveExamSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const exam = await db.studentExam.create({
      data: {
        userId: auth.session.userId,
        taskIds: JSON.stringify(bodyResult.data.taskIds),
        timeLimit: bodyResult.data.timeLimit,
        mode: bodyResult.data.mode,
        avgScore: bodyResult.data.avgScore,
        bestTaskId: bodyResult.data.bestTaskId ?? null,
        bestTaskScore: bodyResult.data.bestTaskScore,
        worstTaskId: bodyResult.data.worstTaskId ?? null,
        worstTaskScore: bodyResult.data.worstTaskScore,
        totalCorrectness: bodyResult.data.totalCorrectness,
        timeSpent: bodyResult.data.timeSpent,
        results: JSON.stringify(bodyResult.data.results),
      },
    });

    return NextResponse.json({ exam }, { status: 201 });
  });
}
