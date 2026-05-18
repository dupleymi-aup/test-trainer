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

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });

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
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });

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

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });

  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return { response: NextResponse.json({ error: "Forbidden: teacher or admin access required" }, { status: 403 }) };
  }

  if (!user.isActive) {
    return { response: NextResponse.json({ error: "Account is inactive" }, { status: 403 }) };
  }

  return { session: { userId: user.id, role: user.role } };
}
