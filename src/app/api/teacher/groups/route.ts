import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { formatZodError } from "@/lib/api-error-handler";

export async function GET() {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    // Filter groups by teacher ownership — prevent access to all groups on platform
    const where = session.role === "ADMIN" ? {} : { createdByUserId: session.userId };

    const groups = await db.group.findMany({
      where,
      include: {
        _count: { select: { members: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ groups }, { status: 200 });
  } catch (error) {
    logger.error("Failed to fetch groups", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

const createGroupSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(200, "Название слишком длинное"),
  description: z.string().max(1000, "Описание слишком длинное").optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: formatZodError(parsed.error) }, { status: 400 });
    }

    const group = await db.group.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        createdByUserId: session.userId,
      },
      include: { _count: { select: { members: true } } },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create group", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
