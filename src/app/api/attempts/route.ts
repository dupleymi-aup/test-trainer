import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { parseRequestBody, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";

const createAttemptSchema = z.object({
  taskId: z.string().min(1, "Task ID is required").max(100, "Task ID is too long"),
  testCases: z.array(z.object({
    id: z.string().max(100, "Test case ID is too long"),
    inputs: z.array(z.unknown()),
    expectedOutput: z.string().max(5000, "Expected output is too long"),
    category: z.string().max(100, "Category is too long"),
    comment: z.string().max(500, "Comment is too long").optional(),
  })),
  score: z.number().int().min(0).max(100),
  ecCoverage: z.number().int().min(0).max(100),
  bvCoverage: z.number().int().min(0).max(100),
  correctness: z.number().int().min(0).max(100),
  coveredEcIds: z.array(z.string().max(200)),
  coveredBvDescriptions: z.array(z.string().max(500)),
  timeSpent: z.number().int().min(0),
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const auth = unwrapGuard(await requireAuth());
    unwrapGuard(await requireCSRF(req), 403, "CSRF token missing or invalid");

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`attemptSubmission:${ip}`, rateLimits.attemptSubmission);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const bodyResult = await parseRequestBody(req, createAttemptSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { taskId, testCases, score, ecCoverage, bvCoverage, correctness, coveredEcIds, coveredBvDescriptions, timeSpent } = bodyResult.data;

    // Check group-based task permissions
    const userGroups = await db.userGroup.findMany({
      where: { userId: auth.userId },
      select: { groupId: true },
    });

    if (userGroups.length > 0) {
      const groupIds = userGroups.map((g) => g.groupId);
      const groupTasks = await db.groupTask.findMany({
        where: { groupId: { in: groupIds } },
        select: { taskId: true },
      });

      // If any group has task restrictions, enforce whitelist
      if (groupTasks.length > 0) {
        const allowedTaskIds = new Set(groupTasks.map((gt) => String(gt.taskId)));
        if (!allowedTaskIds.has(taskId)) {
          return NextResponse.json({ error: "Task is not available for your group" }, { status: 403 });
        }
      }
    }

    const attempt = await db.attempt.create({
      data: {
        userId: auth.userId,
        taskId,
        testCases: JSON.stringify(testCases),
        score,
        ecCoverage,
        bvCoverage,
        correctness,
        coveredEcIds: JSON.stringify(coveredEcIds),
        coveredBvDescriptions: JSON.stringify(coveredBvDescriptions),
        timeSpent,
      },
    });

    return NextResponse.json({ success: true, attemptId: attempt.id }, { status: 201 });
  });
}

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const auth = unwrapGuard(await requireAuth());

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const limitParam = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 200)) : 50;

    const attempts = await db.attempt.findMany({
      where: {
        userId: auth.userId,
        ...(taskId ? { taskId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        taskId: true,
        score: true,
        ecCoverage: true,
        bvCoverage: true,
        correctness: true,
        timeSpent: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ attempts }, { status: 200 });
  });
}
