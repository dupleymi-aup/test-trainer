import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { withErrorHandler } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";

export async function GET() {
  return withErrorHandler(undefined, async () => {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const where = session.role === "ADMIN" ? {} : { createdByUserId: session.userId };

    const templates = await db.courseTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignments: {
          include: { group: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ templates });
  });
}

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  taskIds: z.array(z.number().int().positive()).min(1, "At least one task is required"),
  topics: z.array(z.string()).optional(),
  estimatedHours: z.number().int().min(1).max(500).optional(),
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`teacherTemplateCrud:${ip}`, rateLimits.teacherTemplateCrud);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
    }

    const template = await db.courseTemplate.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        taskIds: JSON.stringify(parsed.data.taskIds),
        topics: parsed.data.topics ? JSON.stringify(parsed.data.topics) : null,
        estimatedHours: parsed.data.estimatedHours || null,
        createdByUserId: session.userId,
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "TEMPLATE_CREATE",
        entity: "CourseTemplate",
        entityId: template.id,
        details: JSON.stringify({ name: template.name }),
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  });
}
