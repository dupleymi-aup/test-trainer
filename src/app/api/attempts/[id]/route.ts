import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/admin-guard";
import { logger } from "@/lib/logger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if ("response" in auth) return auth.response;

    const { id } = await params;

    const attempt = await db.attempt.findUnique({
      where: { id },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Users can only view their own attempts
    if (attempt.userId !== auth.session.userId) {
      // Check if admin or teacher
      if (auth.session.role !== "ADMIN" && auth.session.role !== "TEACHER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    logger.error("Failed to fetch attempt", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
