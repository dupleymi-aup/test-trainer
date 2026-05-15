import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
      },
    }),
    db.activityLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
