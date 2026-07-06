import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { formatZodError, withErrorHandler } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, getClientIp, rateLimits } from "@/lib/rate-limit";

export async function GET() {
  return withErrorHandler(undefined, async () => {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

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
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const ip = getClientIp(req);
    const rl = checkRateLimit("teacherGroupCrud:" + ip, rateLimits.teacherGroupCrud);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: formatZodError(parsed.error) }, { status: 400 });
    }

    const group = await db.group.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        createdByUserId: session.userId,
      },
      include: { _count: { select: { members: true } } },
    });

    return NextResponse.json({ group }, { status: 201 });
  });
}
