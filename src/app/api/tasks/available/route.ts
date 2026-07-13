import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/tasks";
import { withErrorHandler } from "@/lib/api-error-handler";

export async function GET(req: NextRequest) {
  return withErrorHandler(undefined, async () => {
    const token = await getToken({ req });

    // No session — return all tasks (unrestricted for non-authenticated)
    if (!token?.sub) {
      return NextResponse.json({ taskIds: tasks.map((t) => t.id) });
    }

    // Get user's group memberships
    const userGroups = await db.userGroup.findMany({
      where: { userId: token.sub },
      select: { groupId: true },
    });

    // If user is not in any group — return all tasks
    if (userGroups.length === 0) {
      return NextResponse.json({ taskIds: tasks.map((t) => t.id) });
    }

    const groupIds = userGroups.map((g) => g.groupId);

    // Get all task assignments for user's groups
    const groupTasks = await db.groupTask.findMany({
      where: { groupId: { in: groupIds } },
      select: { taskId: true },
    });

    // Check if ANY group has task restrictions
    const hasRestrictions = groupTasks.length > 0;

    if (!hasRestrictions) {
      // No group has restrictions — return all tasks
      return NextResponse.json({ taskIds: tasks.map((t) => t.id) });
    }

    // Return union of all assigned task IDs (whitelist)
    const allowedTaskIds = [...new Set(groupTasks.map((gt) => gt.taskId))];
    return NextResponse.json({ taskIds: allowedTaskIds });
  });
}
