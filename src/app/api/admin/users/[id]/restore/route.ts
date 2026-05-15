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

  const user = await db.user.findUnique({
    where: { id },
    select: { deletedAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.deletedAt) {
    return NextResponse.json({ error: "User is not deleted" }, { status: 400 });
  }

  await db.user.update({
    where: { id },
    data: { deletedAt: null },
  });

  await db.activityLog.create({
    data: {
      userId: session.userId,
      action: "USER_RESTORE",
      entity: "User",
      entityId: id,
      details: JSON.stringify({ action: "restore" }),
    },
  });

  return NextResponse.json({ success: true });
}
