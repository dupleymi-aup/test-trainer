import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { withErrorHandler } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";

export async function GET() {
  return withErrorHandler(undefined, async () => {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;

    const favorites = await db.favoriteTask.findMany({
      where: { userId: auth.session.userId },
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
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`studentFavoriteToggle:${ip}`, rateLimits.studentFavoriteToggle);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const parsed = favoriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error:(parsed.error) }, { status: 400 });
    }

    const existing = await db.favoriteTask.findUnique({
      where: { userId_taskId: { userId: auth.session.userId, taskId: parsed.data.taskId } },
    });

    if (existing) {
      return NextResponse.json({ favorite: existing }, { status: 200 });
    }

    const favorite = await db.favoriteTask.create({
      data: {
        userId: auth.session.userId,
        taskId: parsed.data.taskId,
      },
    });

    return NextResponse.json({ favorite }, { status: 201 });
  });
}

export async function DELETE(req: Request) {
  return withErrorHandler(req, async () => {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`studentFavoriteToggle:${ip}`, rateLimits.studentFavoriteToggle);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

    await db.favoriteTask.deleteMany({
      where: { userId: auth.session.userId, taskId: parseInt(taskId) },
    });

    await db.activityLog.create({
      data: {
        userId: auth.session.userId,
        action: "FAVORITE_REMOVE",
        entity: "FavoriteTask",
        details: JSON.stringify({ taskId: parseInt(taskId) }),
        ipAddress: getClientIp(req),
      },
    });

    return NextResponse.json({ success: true });
  });
}
