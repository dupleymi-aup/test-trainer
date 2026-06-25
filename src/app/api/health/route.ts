import { NextResponse } from "next/server";
import { healthCheck, checkMongoHealth } from "@/lib/db-factory";
import { validateApiResponse, withErrorHandler } from "@/lib/api-error-handler";
import { healthResponseSchema } from "@/lib/api-types";

export const dynamic = "force-dynamic";

let cachedVersion: string | null = null;

async function getVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  try {
    const pkg = await import("../../../../package.json");
    cachedVersion = pkg.version;
  } catch {
    cachedVersion = "0.0.0";
  }
  return cachedVersion;
}

export async function GET() {
  return withErrorHandler(new Request("http://localhost"), async () => {
    const [dbHealth, mongoHealth, version] = await Promise.all([
      healthCheck(),
      checkMongoHealth(),
      getVersion(),
    ]);
    const uptime = process.uptime();

    const allHealthy = dbHealth.ok && (mongoHealth.ok || mongoHealth.details === 'MONGODB_URI not configured');

    const data = {
      status: allHealthy ? "healthy" : dbHealth.ok ? "degraded" : "unhealthy",
      version,
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString(),
      database: dbHealth,
      mongodb: mongoHealth,
      memory: process.memoryUsage(),
    };
    validateApiResponse(healthResponseSchema, data);
    return NextResponse.json(data);
  });
}
