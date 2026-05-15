import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { z } from "zod";
import { tasks } from "@/lib/tasks";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

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
}

const assignTasksSchema = z.object({
  taskIds: z.array(z.number().int().min(1)).min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;
  const { session } = guard;

  const { id } = await params;

  const group = await db.group.findUnique({ where: { id } });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = assignTasksSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.errors }, { status: 400 });
  }

  const validTaskIds = new Set(tasks.map((t) => t.id));
  const invalidTaskIds = parsed.data.taskIds.filter((tid) => !validTaskIds.has(tid));
  if (invalidTaskIds.length > 0) {
    return NextResponse.json({ error: "Invalid task IDs", invalidTaskIds }, { status: 400 });
  }

  await db.groupTask.createMany({
    data: parsed.data.taskIds.map((taskId) => ({ groupId: id, taskId })),
    skipDuplicates: true,
  });

  await db.activityLog.create({
    data: {
      userId: session.userId,
      action: "GROUP_TASKS_ASSIGN",
      entity: "Group",
      entityId: id,
      details: JSON.stringify({ taskIds: parsed.data.taskIds }),
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;
  const { session } = guard;

  const { id } = await params;

  const group = await db.group.findUnique({ where: { id } });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  if (taskId) {
    // Remove single task
    await db.groupTask.deleteMany({
      where: { groupId: id, taskId: parseInt(taskId) },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "GROUP_TASKS_REMOVE",
        entity: "Group",
        entityId: id,
        details: JSON.stringify({ taskIds: [parseInt(taskId)] }),
      },
    });
  } else {
    // Remove multiple from body
    const body = await req.json();
    const parsed = assignTasksSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.errors }, { status: 400 });
    }

    await db.groupTask.deleteMany({
      where: { groupId: id, taskId: { in: parsed.data.taskIds } },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "GROUP_TASKS_REMOVE",
        entity: "Group",
        entityId: id,
        details: JSON.stringify({ taskIds: parsed.data.taskIds }),
      },
    });
  }

  return NextResponse.json({ success: true });
}
