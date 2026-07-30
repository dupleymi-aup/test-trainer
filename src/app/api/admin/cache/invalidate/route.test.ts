import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockInvalidateCache: vi.fn(),
    mockClearCache: vi.fn(),
    mockGetCacheStats: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockCreateRateLimitResponse: vi.fn(),
    mockGetClientIp: vi.fn(),
    adminGuardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    csrfResult: null as { verified: true } | { response: NextResponse } | null,
  },
}));

vi.mock("@/lib/analytics-cache", () => ({
  invalidateCache: mocks.mockInvalidateCache,
  clearCache: mocks.mockClearCache,
  getCacheStats: mocks.mockGetCacheStats,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.mockCheckRateLimit,
  createRateLimitResponse: mocks.mockCreateRateLimitResponse,
  getClientIp: mocks.mockGetClientIp,
  rateLimits: { adminCacheInvalidate: { max: 10, windowMs: 900000 } },
}));

vi.mock("@/lib/admin-guard", () => {
  const m = mocks;
  return {
    requireAdmin: vi.fn().mockImplementation(async () => {
      if (m.adminGuardResult) return m.adminGuardResult;
      return { session: { userId: "admin-1", role: "ADMIN" } };
    }),
  };
});

vi.mock("@/lib/csrf-middleware", () => {
  const m = mocks;
  return {
    requireCSRF: vi.fn().mockImplementation(async () => {
      if (m.csrfResult) return m.csrfResult;
      return { verified: true };
    }),
  };
});

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
  unwrapGuard: vi.fn(<T>(result: { session: T } | { response: NextResponse } | { verified: true } | { response: NextResponse }): T => {
    if ("response" in result) {
      const err = new Error("Unauthorized") as Error & { statusCode: number };
      err.statusCode = (result as { response: NextResponse }).response.status;
      throw err;
    }
    return (result as { session: T }).session as T;
  }),
  parseRequestBody: vi.fn(),
}));

import { GET, POST } from "./route";

function makeGetRequest() {
  return new Request("http://localhost:3000/api/admin/cache/invalidate");
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/admin/cache/invalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setAdminAuthorized() {
  mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
}

function setAdminUnauthorized() {
  mocks.adminGuardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

describe("GET /api/admin/cache/invalidate", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.mockGetCacheStats.mockReturnValue({ size: 3, keys: ["a", "b", "c"] });
  });

  it("returns cache stats", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.size).toBe(3);
    expect(body.keys).toEqual(["a", "b", "c"]);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/cache/invalidate", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockInvalidateCache.mockReturnValue(5);
    mocks.mockClearCache.mockClear();
    mocks.mockInvalidateCache.mockClear();
  });

  it("clears all cache when no pattern provided", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: {},
    });

    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invalidated).toBe("all");
    expect(mocks.mockClearCache).toHaveBeenCalledOnce();
    expect(mocks.mockInvalidateCache).not.toHaveBeenCalled();
  });

  it("invalidates cache by pattern", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { pattern: "analytics:*" },
    });

    const res = await POST(makePostRequest({ pattern: "analytics:*" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invalidated).toBe(5);
    expect(body.pattern).toBe("analytics:*");
    expect(mocks.mockInvalidateCache).toHaveBeenCalledWith("analytics:*");
    expect(mocks.mockClearCache).not.toHaveBeenCalled();
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    mocks.mockCheckRateLimit.mockReturnValue({ limited: true, resetAt: 99999 });
    mocks.mockCreateRateLimitResponse.mockReturnValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 })
    );

    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid body", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: false,
      errorResponse: NextResponse.json({ error: "Invalid body" }, { status: 400 }),
    });

    const res = await POST(makePostRequest({ pattern: 123 }));
    expect(res.status).toBe(400);
  });
});
