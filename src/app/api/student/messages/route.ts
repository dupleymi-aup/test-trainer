import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseRequestBody, withErrorHandler } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 50);

    const [messages, total, unreadCount] = await Promise.all([
      db.message.findMany({
        where: { toUserId: auth.session.userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          fromUser: { select: { id: true, name: true, role: true } },
        },
      }),
      db.message.count({ where: { toUserId: auth.session.userId } }),
      db.message.count({ where: { toUserId: auth.session.userId, read: false } }),
    ]);

    const res = NextResponse.json({ messages, total, page, limit, unreadCount });
    res.headers.set("Cache-Control", "private, max-age=0, stale-while-revalidate=30");
    return res;
  });
}

const markReadSchema = z.object({
  messageIds: z.array(z.string()).min(1),
});

export async function PATCH(req: Request) {
  return withErrorHandler(req, async () => {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`studentMarkRead:${ip}`, rateLimits.studentMarkRead);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const bodyResult = await parseRequestBody(req, markReadSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    await db.message.updateMany({
      where: { id: { in: bodyResult.data.messageIds }, toUserId: auth.session.userId },
      data: { read: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  });
}
