import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export interface AuthSession {
  userId: string;
  role: string;
}

/**
 * Require any authenticated user.
 * Fetches fresh role and active status from DB (never trust client).
 */
export async function requireAuth(): Promise<
  { session: AuthSession } | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  let user;
  try {
    user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, isActive: true },
    });
  } catch (_error) {
    return { response: NextResponse.json({ error: "Internal server error" }, { status: 500 }) };
  }

  if (!user) {
    return { response: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }

  if (!user.isActive) {
    return { response: NextResponse.json({ error: "Account is inactive" }, { status: 403 }) };
  }

  return { session: { userId: user.id, role: user.role } };
}

export interface AdminSession {
  userId: string;
  role: string;
}

export async function requireAdmin(): Promise<
  { session: AdminSession } | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // Fetch fresh role from DB (never trust client-side role)
  let user;
  try {
    user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, isActive: true },
    });
  } catch (_error) {
    return { response: NextResponse.json({ error: "Internal server error" }, { status: 500 }) };
  }

  if (!user || user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 }) };
  }

  if (!user.isActive) {
    return { response: NextResponse.json({ error: "Account is inactive" }, { status: 403 }) };
  }

  return { session: { userId: user.id, role: user.role } };
}

export interface TeacherSession {
  userId: string;
  role: string;
}

export async function requireTeacherOrAdmin(): Promise<
  { session: TeacherSession } | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  let user;
  try {
    user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, isActive: true },
    });
  } catch (_error) {
    return { response: NextResponse.json({ error: "Internal server error" }, { status: 500 }) };
  }

  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return { response: NextResponse.json({ error: "Forbidden: teacher or admin access required" }, { status: 403 }) };
  }

  if (!user.isActive) {
    return { response: NextResponse.json({ error: "Account is inactive" }, { status: 403 }) };
  }

  return { session: { userId: user.id, role: user.role } };
}

/**
 * Verify that the teacher (from session) owns the specified group.
 * Admins bypass ownership check. Returns the group if authorized.
 * Use this to prevent teachers from accessing data outside their groups.
 */
export async function requireTeacherGroup(
  groupId: string,
  session: { userId: string; role: string }
): Promise<{ group: { id: string; createdByUserId: string } } | { response: NextResponse }> {
  if (!groupId) {
    return { response: NextResponse.json({ error: "groupId is required" }, { status: 400 }) };
  }

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { id: true, createdByUserId: true },
  });

  if (!group) {
    return { response: NextResponse.json({ error: "Group not found" }, { status: 404 }) };
  }

  if (session.role !== "ADMIN" && group.createdByUserId !== session.userId) {
    return { response: NextResponse.json({ error: "Forbidden: you can only access your own groups" }, { status: 403 }) };
  }

  return { group };
}

/**
 * Get all group IDs that a teacher owns. Returns all group IDs for admins.
 */
export async function getTeacherGroupIds(userId: string, role: string): Promise<string[]> {
  if (role === "ADMIN") {
    const allGroups = await db.group.findMany({ select: { id: true } });
    return allGroups.map((g) => g.id);
  }

  const groups = await db.group.findMany({
    where: { createdByUserId: userId },
    select: { id: true },
  });
  return groups.map((g) => g.id);
}

export interface StudentSession {
  userId: string;
  role: string;
}

/**
 * Require STUDENT role. Admins bypass (they can access everything).
 * Use this for student-only API endpoints.
 */
export async function requireStudent(): Promise<
  { session: StudentSession } | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  let user;
  try {
    user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, isActive: true },
    });
  } catch (_error) {
    return { response: NextResponse.json({ error: "Internal server error" }, { status: 500 }) };
  }

  if (!user) {
    return { response: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }

  if (user.role !== "STUDENT" && user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "Forbidden: student access required" }, { status: 403 }) };
  }

  if (!user.isActive) {
    return { response: NextResponse.json({ error: "Account is inactive" }, { status: 403 }) };
  }

  return { session: { userId: user.id, role: user.role } };
}
