import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { withErrorHandler } from "@/lib/api-error-handler";

export async function GET() {
  return withErrorHandler(new Request("http://localhost"), async () => {
    const guard = await requireStudent();
    if ("response" in guard) return guard.response;
    const { session } = guard;

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
