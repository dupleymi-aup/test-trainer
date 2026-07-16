import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseRequestBody, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, getClientIp, rateLimits } from "@/lib/rate-limit";

const gradeSchema = z.object({
  userId: z.string(),
  taskId: z.string(),
  score: z.number().min(0).max(100),
  comment: z.string().max(500).optional(),
});

/**
 * Verify that a student belongs to one of the teacher's groups.
 * Admins bypass this check.
 */
async function verifyStudentInTeacherGroup(
  studentId: string,
  teacherUserId: string,
  teacherRole: string,
): Promise<boolean> {
  if (teacherRole === "ADMIN") return true;

  const membership = await db.userGroup.findFirst({
    where: {
      userId: studentId,
      group: { createdByUserId: teacherUserId },
    },
  });
  return !!membership;
}

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireTeacherOrAdmin());

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    // Get student IDs from teacher's groups
    let userIds: string[] = [];
    if (groupId) {
      const members = await db.userGroup.findMany({
        where: { groupId },
        select: { userId: true },
      });
      userIds = members.map((m) => m.userId);
    } else {
      const groups = await db.group.findMany({
        where: { createdByUserId: session.userId },
        select: { id: true },
      });
      const groupIds = groups.map((g) => g.id);
      const members = await db.userGroup.findMany({
        where: { groupId: { in: groupIds } },
        select: { userId: true },
      });
      userIds = [...new Set(members.map((m) => m.userId))];
    }

    if (userIds.length === 0) return NextResponse.json({ grades: [], students: [] });

    // Get all grades for these students
    const grades = await db.grade.findMany({
      where: { userId: { in: userIds } },
      include: {
        user: { select: { id: true, name: true, email: true, group: true } },
        gradedBy: { select: { id: true, name: true } },
      },
      orderBy: { gradedAt: "desc" },
    });

    // Get student info
    const students = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, group: true },
    });

    return NextResponse.json({ grades, students });
  });
}

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireTeacherOrAdmin());

    const ip = getClientIp(req);
    const rl = checkRateLimit("teacherGradebook:" + ip, rateLimits.teacherGradebook);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);

    unwrapGuard(await requireCSRF(req));

    const bodyResult = await parseRequestBody(req, gradeSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { userId, taskId, score, comment } = bodyResult.data;

    // Verify the student belongs to one of this teacher's groups
    const isAuthorized = await verifyStudentInTeacherGroup(userId, session.userId, session.role);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: student is not in your group" }, { status: 403 });
    }

    const grade = await db.grade.upsert({
      where: { userId_taskId: { userId, taskId } },
      create: {
        userId,
        taskId,
        score,
        comment: comment || null,
        gradedById: session.userId,
      },
      update: {
        score,
        comment: comment || null,
        gradedById: session.userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "GRADE_SET",
        entity: "Grade",
        entityId: grade.id,
        details: JSON.stringify({ userId, taskId, score }),
      },
    });

    return NextResponse.json({ grade });
  });
}

export async function DELETE(req: Request) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireTeacherOrAdmin());

    const ip = getClientIp(req);
    const rl = checkRateLimit("teacherGradebook:" + ip, rateLimits.teacherGradebook);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);

    unwrapGuard(await requireCSRF(req));

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const taskId = searchParams.get("taskId");

    if (!userId || !taskId) {
      return NextResponse.json({ error: "Missing userId or taskId" }, { status: 400 });
    }

    // Verify the student belongs to one of this teacher's groups
    const isAuthorized = await verifyStudentInTeacherGroup(userId, session.userId, session.role);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: student is not in your group" }, { status: 403 });
    }

    try {
      await db.grade.delete({
        where: { userId_taskId: { userId, taskId } },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        return NextResponse.json({ error: "Grade not found" }, { status: 404 });
      }
      throw e;
    }

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "GRADE_DELETE",
        entity: "Grade",
        details: JSON.stringify({ userId, taskId }),
      },
    });

    return NextResponse.json({ success: true });
  });
}
