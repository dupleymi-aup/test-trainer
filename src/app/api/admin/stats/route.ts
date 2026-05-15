import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET() {
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
}
