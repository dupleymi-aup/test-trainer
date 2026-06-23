import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { formatZodError } from "@/lib/api-error-handler";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        deletedAt: true,
        avatar: true,
        bio: true,
        university: true,
        group: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            attempts: true,
            activityLogs: true,
            groups: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    logger.error("Failed to fetch user", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  email: z.string().email("Invalid email format").max(255, "Email is too long").optional().nullable(),
  phone: z.string().max(20, "Phone number is too long").optional().nullable(),
  avatar: z.string().max(500, "Avatar URL is too long").optional().nullable(),
  bio: z.string().max(1000, "Bio is too long").optional().nullable(),
  university: z.string().max(200, "University name is too long").optional().nullable(),
  group: z.string().max(100, "Group name is too long").optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`adminUserCrud:${ip}`, rateLimits.adminUserCrud);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: formatZodError(parsed.error) }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (existing.deletedAt) {
      return NextResponse.json({ error: "Cannot update a deleted user" }, { status: 400 });
    }

    // Check email/phone uniqueness if being changed
    const updateData = parsed.data as Record<string, unknown>;
    if (updateData.email && updateData.email !== existing.email) {
      const emailTaken = await db.user.findFirst({
        where: { email: (updateData.email as string).toLowerCase().trim(), id: { not: id } },
        select: { id: true },
      });
      if (emailTaken) {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
      }
    }
    if (updateData.phone !== undefined && updateData.phone !== existing.phone) {
      const phoneStr = updateData.phone as string | null;
      if (phoneStr) {
        const phoneTaken = await db.user.findFirst({
          where: { phone: phoneStr.trim(), id: { not: id } },
          select: { id: true },
        });
        if (phoneTaken) {
          return NextResponse.json({ error: "A user with this phone number already exists" }, { status: 409 });
        }
      }
    }

    const user = await db.user.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "USER_UPDATE",
        entity: "User",
        entityId: id,
        details: JSON.stringify(parsed.data),
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    logger.error("Failed to update user", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const csrf = await requireCSRF(_req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const ip = getClientIp(_req);
    const rateLimit = checkRateLimit(`adminUserCrud:${ip}`, rateLimits.adminUserCrud);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === session.userId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (existing.deletedAt) {
      return NextResponse.json({ error: "User is already deleted" }, { status: 400 });
    }

    // Soft delete
    await db.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "USER_DELETE",
        entity: "User",
        entityId: id,
        details: JSON.stringify({ email: existing.email }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete user", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
