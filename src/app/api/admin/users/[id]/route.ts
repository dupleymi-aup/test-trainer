import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
}

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  university: z.string().optional().nullable(),
  group: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;
  const { session } = guard;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.errors }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;
  const { session } = guard;

  const { id } = await params;

  // Prevent self-deletion
  if (id === session.userId) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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
}
