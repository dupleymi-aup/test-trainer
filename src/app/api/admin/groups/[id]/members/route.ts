import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseRequestBody, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, getClientIp, rateLimits } from "@/lib/rate-limit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(req, async () => {
    unwrapGuard(await requireAdmin());

    const { id } = await params;
    const members = await db.userGroup.findMany({
      where: { groupId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json({ members: members.map((m) => m.user) });
  });
}

const addMemberSchema = z.object({
  userId: z.string().min(1),
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
    unwrapGuard(await requireCSRF(req));    const { id } = await params;
    const bodyResult = await parseRequestBody(req, addMemberSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const existing = await db.userGroup.findUnique({
      where: { userId_groupId: { userId: bodyResult.data.userId, groupId: id } },
    });

    if (existing) {
      return NextResponse.json({ error: "User is already a member of this group" }, { status: 409 });
    }

    try {
      await db.userGroup.create({
        data: {
          userId: bodyResult.data.userId,
          groupId: id,
          assignedByUserId: session.userId,
        },
      });
    } catch (createError) {
      if (
        createError instanceof Prisma.PrismaClientKnownRequestError &&
        createError.code === "P2002"
      ) {
        return NextResponse.json({ error: "User is already a member of this group" }, { status: 409 });
      }
      throw createError;
    }

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
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await db.userGroup.delete({
      where: { userId_groupId: { userId, groupId: id } },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "GROUP_MEMBER_REMOVE",
        entity: "UserGroup",
        entityId: id,
        details: JSON.stringify({ removedUserId: userId }),
        ipAddress: getClientIp(req),
      },
    });

    return NextResponse.json({ success: true });
  });
}
