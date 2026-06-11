import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { formatZodError } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

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
  } catch (error) {
    logger.error("Failed to fetch group members", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch group members" }, { status: 500 });
  }
}

const addMemberSchema = z.object({
  userId: z.string().min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const ip = getClientIp(req);
    const rl = checkRateLimit("adminGroupCrud:" + ip, rateLimits.adminGroupCrud);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const { id } = await params;
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: formatZodError(parsed.error) }, { status: 400 });
    }

    const existing = await db.userGroup.findUnique({
      where: { userId_groupId: { userId: parsed.data.userId, groupId: id } },
    });

    if (existing) {
      return NextResponse.json({ error: "User is already a member of this group" }, { status: 409 });
    }

    try {
      await db.userGroup.create({
        data: {
          userId: parsed.data.userId,
          groupId: id,
          assignedByUserId: session.userId,
        },
      });
    } catch (createError) {
      if (
        createError instanceof Error &&
        createError.message.includes("P2002")
      ) {
        return NextResponse.json({ error: "User is already a member of this group" }, { status: 409 });
      }
      throw createError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to add group member", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to add group member" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const ip = getClientIp(req);
    const rl = checkRateLimit("adminGroupCrud:" + ip, rateLimits.adminGroupCrud);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await db.userGroup.delete({
      where: { userId_groupId: { userId, groupId: id } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to remove group member", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to remove group member" }, { status: 500 });
  }
}
