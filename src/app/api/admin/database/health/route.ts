import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  try {
    // Run a simple query to check DB health
    const [userCount, attemptCount, groupCount] = await Promise.all([
      db.user.count(),
      db.attempt.count(),
      db.group.count(),
    ]);

    return NextResponse.json({
      status: "healthy",
      tables: {
        users: userCount,
        attempts: attemptCount,
        groups: groupCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
