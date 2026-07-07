import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { parseRequestBody, withErrorHandler } from "@/lib/api-error-handler";

const deadlineSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(2000, "Description is too long").optional().nullable(),
  dueDate: z.string().datetime({ message: "Invalid date format" }),
  type: z.enum(["EXAM", "TEST", "ASSIGNMENT", "COURSE_END", "REGISTRATION_END"]),
  groupId: z.string().nullable().optional(),
  taskId: z.number().nullable().optional(),
  targetUsers: z.enum(["ALL_STUDENTS", "GROUP_MEMBERS", "SPECIFIC"]).default("ALL_STUDENTS"),
  specificUserIds: z.array(z.string()).max(1000).optional(),
  reminderSchedule: z.array(z.number()).max(20).optional(),
});

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const groupId = searchParams.get("groupId");
    const showPast = searchParams.get("showPast") === "true";

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (groupId) where.groupId = groupId;
    if (!showPast) where.dueDate = { gte: new Date() };

    const deadlines = await db.deadline.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: {
        group: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { reminders: true } },
      },
    });

    return NextResponse.json({ deadlines }, { status: 200 });
  });
}

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`adminDeadlineCrud:${ip}`, rateLimits.adminDeadlineCrud);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const bodyResult = await parseRequestBody(req, deadlineSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { title, description, dueDate, type, groupId, taskId, targetUsers, specificUserIds, reminderSchedule } = bodyResult.data;

    const deadline = await db.deadline.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        type,
        groupId: groupId || null,
        taskId: taskId || null,
        createdBy: session.userId,
        reminderSchedule: reminderSchedule ? JSON.stringify(reminderSchedule) : null,
      },
      include: {
        group: { select: { id: true, name: true } },
      },
    });

    // Create reminders for target users
    let userIds: string[] = [];

    if (targetUsers === "ALL_STUDENTS") {
      const students = await db.user.findMany({
        where: { role: "STUDENT", deletedAt: null, isActive: true },
        select: { id: true },
      });
      userIds = students.map((s) => s.id);
    } else if (targetUsers === "GROUP_MEMBERS" && groupId) {
      const members = await db.userGroup.findMany({
        where: { groupId },
        select: { userId: true },
      });
      userIds = members.map((m) => m.userId);
    } else if (targetUsers === "SPECIFIC" && specificUserIds) {
      userIds = specificUserIds;
    }

    if (userIds.length > 0) {
      await db.reminder.createMany({
        data: userIds.map((userId) => ({
          deadlineId: deadline.id,
          userId,
        })),
      });
    }

    // Log activity
    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "DEADLINE_CREATE",
        entity: "Deadline",
        entityId: deadline.id,
        details: JSON.stringify({ title, type, dueDate, targetUsers }),
      },
    });

    return NextResponse.json({ deadline, remindersCount: userIds.length }, { status: 201 });
  });
}

export async function PATCH(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`adminDeadlineCrud:${ip}`, rateLimits.adminDeadlineCrud);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const bodyResult = await parseRequestBody(req, deadlineSchema.partial());
    if (!bodyResult.success) return bodyResult.errorResponse;

    const updateData: Record<string, unknown> = { ...bodyResult.data };
    if (bodyResult.data.dueDate) updateData.dueDate = new Date(bodyResult.data.dueDate);
    if (updateData.groupId === undefined) delete updateData.groupId;
    if (updateData.taskId === undefined) delete updateData.taskId;
    if (updateData.targetUsers === undefined) delete updateData.targetUsers;
    if (updateData.reminderSchedule === undefined) delete updateData.reminderSchedule;

    const deadline = await db.deadline.update({
      where: { id },
      data: updateData,
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "DEADLINE_UPDATE",
        entity: "Deadline",
        entityId: id,
        details: JSON.stringify(bodyResult.data),
      },
    });

    return NextResponse.json({ deadline });
  });
}

export async function DELETE(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`adminDeadlineCrud:${ip}`, rateLimits.adminDeadlineCrud);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.deadline.delete({ where: { id } });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "DEADLINE_DELETE",
        entity: "Deadline",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  });
}
