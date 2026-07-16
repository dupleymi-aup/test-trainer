import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { tasks } from "@/lib/tasks";
import { parseRequestBody, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, getClientIp, rateLimits } from "@/lib/rate-limit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(_req, async () => {
    unwrapGuard(await requireAdmin());

    const { id } = await params;

    const group = await db.group.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const assignedTasks = await db.groupTask.findMany({
      where: { groupId: id },
      select: { taskId: true },
    });

    const assignedTaskIds = new Set(assignedTasks.map((t) => t.taskId));

    const allTasks = tasks.map((t) => ({
      id: t.id,
      name: t.name,
      difficulty: t.difficulty,
      description: t.description,
      isAssigned: assignedTaskIds.has(t.id),
    }));

    return NextResponse.json({ tasks: allTasks });
  });
}

const assignTasksSchema = z.object({
  taskIds: z.array(z.number().int().min(1)).min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireAdmin());
    const ip = getClientIp(req);
    const rl = checkRateLimit("adminGroupCrud:" + ip, rateLimits.adminGroupCrud);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    unwrapGuard(await requireCSRF(req));
    const { id } = await params;

    const group = await db.group.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const bodyResult = await parseRequestBody(req, assignTasksSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const validTaskIds = new Set(tasks.map((t) => t.id));
    const invalidTaskIds = bodyResult.data.taskIds.filter((tid) => !validTaskIds.has(tid));
    if (invalidTaskIds.length > 0) {
      return NextResponse.json({ error: "Invalid task IDs", invalidTaskIds }, { status: 400 });
    }

    const uniqueTaskIds = [...new Set(bodyResult.data.taskIds)];
    await db.groupTask.createMany({
      data: uniqueTaskIds.map((taskId) => ({ groupId: id, taskId })),
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "GROUP_TASKS_ASSIGN",
        entity: "Group",
        entityId: id,
        details: JSON.stringify({ taskIds: bodyResult.data.taskIds }),
      },
    });

    return NextResponse.json({ success: true });
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireAdmin());
    const ip = getClientIp(req);
    const rl = checkRateLimit("adminGroupCrud:" + ip, rateLimits.adminGroupCrud);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    unwrapGuard(await requireCSRF(req));
    const { id } = await params;

    const group = await db.group.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (taskId) {
      const parsedTaskId = parseInt(taskId, 10);
      if (!Number.isFinite(parsedTaskId)) {
        return NextResponse.json({ error: "Invalid taskId" }, { status: 400 });
      }
      // Remove single task
      await db.groupTask.deleteMany({
        where: { groupId: id, taskId: parsedTaskId },
      });

      await db.activityLog.create({
        data: {
          userId: session.userId,
          action: "GROUP_TASKS_REMOVE",
          entity: "Group",
          entityId: id,
          details: JSON.stringify({ taskIds: [parsedTaskId] }),
        },
      });
    } else {
      // Remove multiple from body
      const bodyResult = await parseRequestBody(req, assignTasksSchema);
      if (!bodyResult.success) return bodyResult.errorResponse;

      await db.groupTask.deleteMany({
        where: { groupId: id, taskId: { in: bodyResult.data.taskIds } },
      });

      await db.activityLog.create({
        data: {
          userId: session.userId,
          action: "GROUP_TASKS_REMOVE",
          entity: "Group",
          entityId: id,
          details: JSON.stringify({ taskIds: bodyResult.data.taskIds }),
        },
      });
    }

    return NextResponse.json({ success: true });
  });
}
