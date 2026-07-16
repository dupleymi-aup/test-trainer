import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseRequestBody, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";

export async function GET() {
  return withErrorHandler(undefined, async () => {
    const auth = unwrapGuard(await requireStudent());

    const favorites = await db.favoriteTask.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, taskId: true, createdAt: true },
    });

    return NextResponse.json({ favorites });
  });
}

const favoriteSchema = z.object({
  taskId: z.number().int().positive(),
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const auth = unwrapGuard(await requireStudent());
    unwrapGuard(await requireCSRF(req));

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`studentFavoriteToggle:${ip}`, rateLimits.studentFavoriteToggle);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const bodyResult = await parseRequestBody(req, favoriteSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const existing = await db.favoriteTask.findUnique({
      where: { userId_taskId: { userId: auth.userId, taskId: bodyResult.data.taskId } },
    });

    if (existing) {
      return NextResponse.json({ favorite: existing }, { status: 200 });
    }

    const favorite = await db.favoriteTask.create({
      data: {
        userId: auth.userId,
        taskId: bodyResult.data.taskId,
      },
    });

    return NextResponse.json({ favorite }, { status: 201 });
  });
}

export async function DELETE(req: Request) {
  return withErrorHandler(req, async () => {
    const auth = unwrapGuard(await requireStudent());
    unwrapGuard(await requireCSRF(req));

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`studentFavoriteToggle:${ip}`, rateLimits.studentFavoriteToggle);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

    const parsedTaskId = parseInt(taskId, 10);
    if (!Number.isFinite(parsedTaskId)) {
      return NextResponse.json({ error: "Invalid taskId" }, { status: 400 });
    }

    await db.favoriteTask.deleteMany({
      where: { userId: auth.userId, taskId: parsedTaskId },
    });

    await db.activityLog.create({
      data: {
        userId: auth.userId,
        action: "FAVORITE_REMOVE",
        entity: "FavoriteTask",
        details: JSON.stringify({ taskId: parsedTaskId }),
        ipAddress: getClientIp(req),
      },
    });

    return NextResponse.json({ success: true });
  });
}
