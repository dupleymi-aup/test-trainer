import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const [totalUsers, usersByRole, totalAttempts, totalGroups, recentActivity] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.user.groupBy({
      by: ["role"],
      where: { deletedAt: null },
      _count: true,
    }),
    db.attempt.count(),
    db.group.count(),
    db.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
      },
    }),
  ]);

  const roleCounts: Record<string, number> = {};
  usersByRole.forEach((r) => {
    roleCounts[r.role] = r._count;
  });

  return NextResponse.json({
    totalUsers,
    usersByRole: roleCounts,
    totalAttempts,
    totalGroups,
    recentActivity,
  });
  } catch (error) {
    logger.error("Failed to fetch admin stats", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
