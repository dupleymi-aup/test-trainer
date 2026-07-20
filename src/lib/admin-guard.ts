import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { type Permission, hasPermission } from "@/lib/permissions";

export interface AuthSession {
  userId: string;
  role: string;
}

interface DBUser {
  id: string;
  role: string;
  isActive: boolean;
}

/**
 * Fetch fresh user data from DB for session validation.
 */
async function fetchUserFromSession(sessionUserId: string): Promise<
  { user: DBUser } | { response: NextResponse }
> {
  let user: DBUser | null;
  try {
    user = await db.user.findUnique({
      where: { id: sessionUserId },
      select: { id: true, role: true, isActive: true },
    });
  } catch (error) {
    logger.error("Database query failed in auth guard", { userId: sessionUserId, error });
    return { response: NextResponse.json({ error: "Internal server error" }, { status: 500 }) };
  }

  if (!user) {
    return { response: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }

  return { user };
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

  const result = await fetchUserFromSession(session.user.id);
  if ("response" in result) return result;

  if (!result.user.isActive) {
    return { response: NextResponse.json({ error: "Account is inactive" }, { status: 403 }) };
  }

  return { session: { userId: result.user.id, role: result.user.role } };
}

export async function requireAdmin(): Promise<
  { session: AuthSession } | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const result = await fetchUserFromSession(session.user.id);
  if ("response" in result) return result;

  if (result.user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 }) };
  }
  if (!result.user.isActive) {
    return { response: NextResponse.json({ error: "Forbidden: account is inactive" }, { status: 403 }) };
  }

  return { session: { userId: result.user.id, role: result.user.role } };
}

export async function requireTeacherOrAdmin(): Promise<
  { session: AuthSession } | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const result = await fetchUserFromSession(session.user.id);
  if ("response" in result) return result;

  if ((result.user.role !== "TEACHER" && result.user.role !== "ADMIN") || !result.user.isActive) {
    return { response: NextResponse.json({ error: "Forbidden: teacher or admin access required" }, { status: 403 }) };
  }

  return { session: { userId: result.user.id, role: result.user.role } };
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

/**
 * Require STUDENT role. Use this for student-only API endpoints.
 */
export async function requireStudent(): Promise<
  { session: AuthSession } | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const result = await fetchUserFromSession(session.user.id);
  if ("response" in result) return result;

  if (result.user.role !== "STUDENT" || !result.user.isActive) {
    return { response: NextResponse.json({ error: "Forbidden: student access required" }, { status: 403 }) };
  }

  return { session: { userId: result.user.id, role: result.user.role } };
}

export async function requirePermission(
  requiredPermission: Permission
): Promise<{ session: AuthSession } | { response: NextResponse }> {
  const auth = await requireAuth();
  if ("response" in auth) return auth;

  if (!hasPermission(auth.session.role, requiredPermission)) {
    return { response: NextResponse.json({ error: `Forbidden: missing permission '${requiredPermission}'` }, { status: 403 }) };
  }

  return { session: auth.session };
}

export async function requirePermissionOrRole(
  requiredPermission: Permission,
  allowedRoles: string[]
): Promise<{ session: AuthSession } | { response: NextResponse }> {
  const auth = await requireAuth();
  if ("response" in auth) return auth;

  if (allowedRoles.includes(auth.session.role)) return { session: auth.session };
  if (hasPermission(auth.session.role, requiredPermission)) return { session: auth.session };

  return { response: NextResponse.json({ error: `Forbidden: missing permission '${requiredPermission}'` }, { status: 403 }) };
}
