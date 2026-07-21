import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getCache, setCache, makeCacheKey, DEFAULT_TTL } from "@/lib/analytics-cache";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { MS_PER_DAY } from "@/lib/time-constants";

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    unwrapGuard(await requireAdmin());

    const cacheKey = makeCacheKey("deadline-compliance");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const now = new Date();

    // All deadlines
    const deadlines = await db.deadline.findMany({
      select: {
        id: true, title: true, dueDate: true, type: true,
        group: { select: { id: true, name: true } },
        _count: { select: { reminders: true } },
      },
      orderBy: { dueDate: "desc" },
    });

    const overdue = deadlines.filter((d) => d.dueDate < now);
    const upcoming = deadlines.filter((d) => d.dueDate >= now);
    const overdueRate = deadlines.length > 0
      ? Math.round((overdue.length / deadlines.length) * 100)
      : 0;

    // Group-level compliance
    const groups = await db.group.findMany({
      select: { id: true, name: true },
    });

    // Batch-fetch member counts for all groups (avoids N+1)
    const allGroupMembers = await db.userGroup.groupBy({
      by: ["groupId"],
      _count: { userId: true },
    });
    const memberCountByGroup = new Map(
      allGroupMembers.map((g) => [g.groupId, g._count.userId])
    );

    const groupCompliance = groups.map((g) => {
      const groupDeadlines = deadlines.filter(
        (d) => d.group?.id === g.id
      );
      const groupOverdue = groupDeadlines.filter((d) => d.dueDate < now);
      const onTime = groupDeadlines.length - groupOverdue.length;
      const onTimeRate = groupDeadlines.length > 0
        ? Math.round((onTime / groupDeadlines.length) * 100)
        : null;

      return {
        groupId: g.id,
        name: g.name,
        totalDeadlines: groupDeadlines.length,
        overdue: groupOverdue.length,
        onTimeRate,
        memberCount: memberCountByGroup.get(g.id) ?? 0,
      };
    });

    // Type breakdown
    const typeLabels: Record<string, string> = {
      EXAM: "Экзамен", TEST: "Зачёт", ASSIGNMENT: "Задание",
      COURSE_END: "Окончание курса", REGISTRATION_END: "Окончание регистрации",
    };

    const typeBreakdown = deadlines.reduce<Record<string, { total: number; overdue: number }>>((acc, d) => {
      if (!acc[d.type]) acc[d.type] = { total: 0, overdue: 0 };
      acc[d.type].total++;
      if (d.dueDate < now) acc[d.type].overdue++;
      return acc;
    }, {});

    const result = {
      summary: {
        total: deadlines.length,
        overdue: overdue.length,
        upcoming: upcoming.length,
        overdueRate,
      },
      typeBreakdown: Object.entries(typeBreakdown).map(([type, data]) => ({
        type,
        label: typeLabels[type] || type,
        ...data,
      })),
      groupCompliance: groupCompliance.filter((g) => g.totalDeadlines > 0).sort((a, b) => (a.onTimeRate ?? 100) - (b.onTimeRate ?? 100)),
      overdueList: overdue.slice(0, 20).map((d) => ({
        id: d.id,
        title: d.title,
        type: typeLabels[d.type] || d.type,
        dueDate: d.dueDate.toISOString(),
        daysOverdue: Math.floor((now.getTime() - d.dueDate.getTime()) / MS_PER_DAY),
        groupName: d.group?.name || null,
      })),
    };

    setCache(cacheKey, result, DEFAULT_TTL.medium);
    return NextResponse.json(result);
  });
}
