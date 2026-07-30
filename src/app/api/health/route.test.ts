import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockHealthCheck: vi.fn(),
    mockCheckMongoHealth: vi.fn(),
  },
}));

vi.mock("@/lib/db-factory", () => ({
  healthCheck: mocks.mockHealthCheck,
  checkMongoHealth: mocks.mockCheckMongoHealth,
}));

vi.mock("@/lib/api-types", () => ({
  healthResponseSchema: {},
}));

vi.mock("@/lib/api-error-handler", () => ({
  withErrorHandler: vi.fn(async (_req: unknown, handler: () => Promise<NextResponse>) => {
    try {
      return await handler();
    } catch (err: unknown) {
      const appErr = err as { statusCode?: number; message?: string };
      if (appErr.statusCode) {
        return NextResponse.json({ error: appErr.message || "Error" }, { status: appErr.statusCode });
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }),
  validateApiResponse: vi.fn(),
}));

import { GET } from "./route";

function makeGetRequest() {
  return new Request("http://localhost:3000/api/health");
}

describe("GET /api/health", () => {
  beforeEach(() => {
    mocks.mockHealthCheck.mockResolvedValue({ ok: true, type: "sqlite", details: "SQLite connected" });
    mocks.mockCheckMongoHealth.mockResolvedValue({ ok: false, details: "MONGODB_URI not configured" });
  });

  it("returns healthy status when DB is up", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.database.ok).toBe(true);
    expect(body.version).toBeDefined();
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toBeDefined();
  });

  it("returns degraded when DB has issues but mongo is optional", async () => {
    mocks.mockHealthCheck.mockResolvedValue({ ok: true, type: "sqlite", details: "degraded" });
    mocks.mockCheckMongoHealth.mockResolvedValue({ ok: false, details: "MONGODB_URI not configured" });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
  });

  it("returns unhealthy when DB is down", async () => {
    mocks.mockHealthCheck.mockResolvedValue({ ok: false, type: "sqlite", details: "Connection refused" });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("unhealthy");
  });
});
