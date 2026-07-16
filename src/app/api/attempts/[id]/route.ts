import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTeacherGroupIds } from "@/lib/admin-guard";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireAuth());

    const { id } = await params;

    const attempt = await db.attempt.findUnique({
      where: { id },
      include: { user: { select: { id: true } } },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Users can only view their own attempts
    if (attempt.userId !== session.userId) {
      if (session.role === "ADMIN") {
        // Admins can view any attempt
      } else if (session.role === "TEACHER") {
        // Teachers can only view attempts from students in their own groups
        const teacherGroupIds = await getTeacherGroupIds(session.userId, session.role);
        const studentInTeacherGroup = await db.userGroup.findFirst({
          where: {
            userId: attempt.userId,
            groupId: { in: teacherGroupIds },
          },
        });
        if (!studentInTeacherGroup) {
          return NextResponse.json({ error: "Forbidden: student is not in your group" }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ attempt });
  });
}
