import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  const groups = await db.group.findMany({
    include: {
      _count: { select: { members: true } },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ groups });
}

const createGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;
  const { session } = guard;

  const body = await req.json();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.errors }, { status: 400 });
  }

  const group = await db.group.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      createdByUserId: session.userId,
    },
    include: {
      _count: { select: { members: true } },
    },
  });

  await db.activityLog.create({
    data: {
      userId: session.userId,
      action: "GROUP_CREATE",
      entity: "Group",
      entityId: group.id,
      details: JSON.stringify({ name: group.name }),
    },
  });

  return NextResponse.json({ group }, { status: 201 });
}
