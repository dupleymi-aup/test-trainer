import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseRequestBody, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, getClientIp, rateLimits } from "@/lib/rate-limit";

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    const session = unwrapGuard(await requireTeacherOrAdmin());

    // Filter groups by teacher ownership — prevent access to all groups on platform
    const where = session.role === "ADMIN" ? {} : { createdByUserId: session.userId };

    const groups = await db.group.findMany({
      where,
      include: {
        _count: { select: { members: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ groups }, { status: 200 });
  });
}

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name is too long"),
  description: z.string().max(1000, "Description is too long").optional(),
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireTeacherOrAdmin());
    const ip = getClientIp(req);
    const rl = checkRateLimit("teacherGroupCrud:" + ip, rateLimits.teacherGroupCrud);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    unwrapGuard(await requireCSRF(req));

    const bodyResult = await parseRequestBody(req, createGroupSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const group = await db.group.create({
      data: {
        name: bodyResult.data.name,
        description: bodyResult.data.description,
        createdByUserId: session.userId,
      },
      include: { _count: { select: { members: true } } },
    });

    return NextResponse.json({ group }, { status: 201 });
  });
}
