import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseRequestBody, withErrorHandler } from "@/lib/api-error-handler";
import { safeJsonParse } from "@/lib/utils";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";

const paramSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(30),
  description: z.string().max(300).optional(),
});

const taskSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  signature: z.string().min(1, "Signature is required"),
  description: z.string().min(1, "Description is required").max(3000),
  returnType: z.string().min(1, "Return type is required"),
  topics: z.array(z.string()).min(1),
  parameters: z.array(paramSchema),
  ecClasses: z.array(z.object({
    className: z.string().min(1),
    ecLabel: z.string().min(1),
    description: z.string().max(500).optional(),
    exampleValues: z.array(z.string()),
  })).min(1),
  bvValues: z.array(z.object({
    value: z.string().min(1),
    description: z.string().max(300).optional(),
  })).min(1),
  code: z.string().min(1, "Code is required"),
  commonMistakes: z.array(z.string()).optional(),
  groupId: z.string().optional(),
});

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    const where: Record<string, unknown> = session.role === "ADMIN"
      ? {}
      : { createdById: session.userId };

    const [tasks, groupIds] = await Promise.all([
      db.customTask.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      }),
      session.role !== "ADMIN"
        ? db.group.findMany({ where: { createdByUserId: session.userId }, select: { id: true } })
        : db.group.findMany({ select: { id: true } }),
    ]);

    if (groupId) {
      const assigned = await db.group.findMany({
        where: { id: groupId },
        select: { id: true, name: true },
      });
      if (assigned.length === 0) {
        return NextResponse.json({ tasks: [], groups: groupIds.map((g) => g.id) });
      }
    }

    return NextResponse.json({
      tasks: tasks.map((t) => ({
        id: t.id, name: t.name, difficulty: t.difficulty, signature: t.signature,
        description: t.description, returnType: t.returnType, topics: safeJsonParse(t.topics, []),
        parameters: safeJsonParse(t.parameters, []),
        ecClasses: safeJsonParse(t.ecClasses, []),
        bvValues: safeJsonParse(t.bvValues, []),
        code: t.code, commonMistakes: safeJsonParse(t.commonMistakes, []),
        createdBy: t.createdBy, createdAt: t.createdAt, updatedAt: t.updatedAt,
      })),
      groupIds: groupIds.map((g) => g.id),
    });
  });
}

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`teacherTaskConstructor:${ip}`, rateLimits.teacherTaskConstructor);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const bodyResult = await parseRequestBody(req, taskSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { groupId, ...taskData } = bodyResult.data;

    const task = await db.customTask.create({
      data: {
        name: taskData.name,
        difficulty: taskData.difficulty,
        signature: taskData.signature,
        description: taskData.description,
        returnType: taskData.returnType,
        topics: JSON.stringify(taskData.topics),
        parameters: JSON.stringify(taskData.parameters),
        ecClasses: JSON.stringify(taskData.ecClasses),
        bvValues: JSON.stringify(taskData.bvValues),
        code: taskData.code,
        commonMistakes: taskData.commonMistakes?.length ? JSON.stringify(taskData.commonMistakes) : null,
        createdById: session.userId,
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "CUSTOM_TASK_CREATE",
        entity: "CustomTask",
        entityId: task.id,
        details: JSON.stringify({ name: task.name, groupId }),
      },
    });

    return NextResponse.json({ task: { ...task, topics: safeJsonParse(task.topics, []), parameters: safeJsonParse(task.parameters, []), ecClasses: safeJsonParse(task.ecClasses, []), bvValues: safeJsonParse(task.bvValues, []), commonMistakes: safeJsonParse(task.commonMistakes, []) } }, { status: 201 });
  });
}

export async function DELETE(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`teacherTaskConstructor:${ip}`, rateLimits.teacherTaskConstructor);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing task ID" }, { status: 400 });

    const task = await db.customTask.findUnique({ where: { id }, select: { createdById: true } });
    if (!task) return NextResponse.json({ error: "Custom task not found" }, { status: 404 });

    if (task.createdById !== session.userId && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.customTask.delete({ where: { id } });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "CUSTOM_TASK_DELETE",
        entity: "CustomTask",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  });
}
