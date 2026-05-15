import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const attempt = await db.attempt.findUnique({
      where: { id },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Users can only view their own attempts
    if (attempt.userId !== session.user.id) {
      // Check if admin or teacher
      if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error("Failed to fetch attempt:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
