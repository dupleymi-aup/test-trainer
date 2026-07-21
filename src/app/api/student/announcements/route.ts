import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    const session = unwrapGuard(await requireStudent());

    // Find groups the student belongs to
    const userGroups = await db.userGroup.findMany({
      where: { userId: session.userId },
      select: { groupId: true },
    });
    const groupIds = userGroups.map((ug) => ug.groupId);

    // Get announcements: system-wide + for their groups
    const announcements = await db.announcement.findMany({
      where: {
        OR: [
          { groupId: { in: groupIds } },
          { groupId: null },
        ],
        AND: {
          OR: [
            { expiresAt: { gt: new Date() } },
            { expiresAt: null },
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        group: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, role: true } },
      },
      take: 50,
    });

    return NextResponse.json({ announcements });
  });
}
