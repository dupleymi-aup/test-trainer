import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { z } from "zod";

const changeRoleSchema = z.object({
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"]),
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
  const parsed = changeRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role", details: parsed.error.errors }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await db.user.update({
    where: { id },
    data: { role: parsed.data.role },
    select: { id: true, name: true, email: true, role: true },
  });

  await db.activityLog.create({
    data: {
      userId: session.userId,
      action: "ROLE_CHANGE",
      entity: "User",
      entityId: id,
      details: JSON.stringify({ from: user.role, to: parsed.data.role }),
    },
  });

  return NextResponse.json({ user: updated });
}
