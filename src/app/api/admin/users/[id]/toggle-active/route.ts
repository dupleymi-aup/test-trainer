import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;
  const { session } = guard;

  const { id } = await params;

  // Prevent self-deactivation
  if (id === session.userId) {
    return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await db.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: { id: true, name: true, email: true, isActive: true },
  });

  await db.activityLog.create({
    data: {
      userId: session.userId,
      action: user.isActive ? "USER_DEACTIVATE" : "USER_ACTIVATE",
      entity: "User",
      entityId: id,
      details: JSON.stringify({ email: user.email }),
    },
  });

  return NextResponse.json({ user: updated });
}
