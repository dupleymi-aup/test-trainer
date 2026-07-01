import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { withErrorHandler } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(_req, async () => {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const template = await db.courseTemplate.findUnique({
      where: { id: (await params).id },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignments: {
          include: { group: { select: { id: true, name: true } } },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (session.role !== "ADMIN" && template.createdByUserId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ template });
  });
}

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  taskIds: z.array(z.number().int().positive()).min(1).optional(),
  topics: z.array(z.string()).nullable().optional(),
  estimatedHours: z.number().int().min(1).max(500).nullable().optional(),
  assignToGroupId: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const templateId = (await params).id;
    const template = await db.courseTemplate.findUnique({ where: { id: templateId } });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (session.role !== "ADMIN" && template.createdByUserId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const parsed = updateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
    }

    const { assignToGroupId, ...updateData } = parsed.data;

    const data: Record<string, unknown> = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.taskIds !== undefined) data.taskIds = JSON.stringify(updateData.taskIds);
    if (updateData.topics !== undefined) data.topics = updateData.topics ? JSON.stringify(updateData.topics) : null;
    if (updateData.estimatedHours !== undefined) data.estimatedHours = updateData.estimatedHours;

    if (Object.keys(data).length > 0) {
      await db.courseTemplate.update({ where: { id: templateId }, data });
    }

    // Handle group assignment
    if (assignToGroupId !== undefined) {
      if (assignToGroupId) {
        await db.templateAssignment.upsert({
          where: { templateId_groupId: { templateId, groupId: assignToGroupId } },
          create: { templateId, groupId: assignToGroupId },
          update: {},
        });
        // Also assign template tasks to the group
        const taskIds = updateData.taskIds || safeJsonParse(template.taskIds, []);
        for (const taskId of taskIds) {
          await db.groupTask.upsert({
            where: { groupId_taskId: { groupId: assignToGroupId, taskId } },
            create: { groupId: assignToGroupId, taskId },
            update: {},
          });
        }
      } else {
        await db.templateAssignment.deleteMany({ where: { templateId } });
      }
    }

    const updated = await db.courseTemplate.findUnique({
      where: { id: templateId },
      include: {
        assignments: { include: { group: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json({ template: updated });
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(_req, async () => {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const ip = getClientIp(_req);
    const rateLimit = checkRateLimit(`teacherTemplateCrud:${ip}`, rateLimits.teacherTemplateCrud);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const templateId = (await params).id;
    const template = await db.courseTemplate.findUnique({ where: { id: templateId } });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (session.role !== "ADMIN" && template.createdByUserId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Clean up assignments first
    await db.templateAssignment.deleteMany({ where: { templateId } });
    await db.courseTemplate.delete({ where: { id: templateId } });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "TEMPLATE_DELETE",
        entity: "CourseTemplate",
        entityId: templateId,
        details: JSON.stringify({ name: template.name }),
      },
    });

    return NextResponse.json({ success: true });
  });
}
