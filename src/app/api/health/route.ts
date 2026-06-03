import { NextResponse } from "next/server";
import { healthCheck } from "@/lib/db-factory";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbHealth = await healthCheck();
    const uptime = process.uptime();

    return NextResponse.json({
      status: dbHealth.ok ? "healthy" : "degraded",
      version: process.env.npm_package_version || "0.2.0",
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString(),
      database: dbHealth,
      memory: process.memoryUsage(),
    });
  } catch (error) {
    logger.error("Health check failed", error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
