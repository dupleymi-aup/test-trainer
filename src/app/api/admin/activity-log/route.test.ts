import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockActivityLogFindMany: vi.fn(),
    mockActivityLogCount: vi.fn(),
    loggerError: vi.fn(),
    adminGuardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    parseSearchParamsResult: {
      success: true,
      data: { page: 1, limit: 20, action: undefined, userId: undefined },
    } as any,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    activityLog: {
      findMany: mocks.mockActivityLogFindMany,
      count: mocks.mockActivityLogCount,
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: mocks.loggerError,
  },
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

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({
    limited: false,
    resetAt: Date.now() + 60000,
  }),
  createRateLimitResponse: vi.fn().mockReturnValue(
    NextResponse.json({ error: "Too many requests" }, { status: 429 })
  ),
  rateLimits: { adminActivityLog: { window: 60000, max: 30 } },
}));

vi.mock("@/lib/api-error-handler", () => {
  const m = mocks;
  return {
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
    parseSearchParams: vi.fn().mockImplementation(() => m.parseSearchParamsResult),
    unwrapGuard: vi.fn(<T>(result: { session: T } | { response: NextResponse }): T => {
      if ("response" in result) {
        const err = new Error("Unauthorized") as Error & { statusCode: number };
        err.statusCode = result.response.status;
        throw err;
      }
      return (result as { session: T }).session;
    }),
  };
});

import { GET } from "./route";

function makeGetRequest(queryParams?: Record<string, string>) {
  const params = new URLSearchParams(queryParams);
  return new Request(`http://localhost:3000/api/admin/activity-log?${params}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
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

const mockLogs = [
  {
    id: "log-1",
    userId: "user-1",
    action: "LOGIN",
    entity: "User",
    entityId: "user-1",
    details: null,
    ipAddress: "127.0.0.1",
    createdAt: new Date("2024-06-01T10:00:00Z"),
    user: { name: "John", email: "john@test.com", role: "STUDENT" },
  },
  {
    id: "log-2",
    userId: "admin-1",
    action: "GROUP_CREATE",
    entity: "Group",
    entityId: "group-1",
    details: JSON.stringify({ name: "QA-2024" }),
    ipAddress: "127.0.0.1",
    createdAt: new Date("2024-06-02T12:00:00Z"),
    user: { name: "Admin", email: "admin@test.com", role: "ADMIN" },
  },
];

describe("GET /api/admin/activity-log", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.parseSearchParamsResult = {
      success: true,
      data: { page: 1, limit: 20, action: undefined, userId: undefined },
    };
    mocks.mockActivityLogFindMany.mockResolvedValue(mockLogs);
    mocks.mockActivityLogCount.mockResolvedValue(2);
  });

  it("returns paginated activity logs", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.logs).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.totalPages).toBe(1);
  });

  it("respects page and limit query params", async () => {
    mocks.parseSearchParamsResult = {
      success: true,
      data: { page: 2, limit: 10, action: undefined, userId: undefined },
    };
    await GET(makeGetRequest({ page: "2", limit: "10" }));
    expect(mocks.mockActivityLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });

  it("passes action filter", async () => {
    mocks.parseSearchParamsResult = {
      success: true,
      data: { page: 1, limit: 20, action: "LOGIN", userId: undefined },
    };
    await GET(makeGetRequest({ action: "LOGIN" }));
    expect(mocks.mockActivityLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: "LOGIN" }),
      })
    );
  });

  it("passes userId filter", async () => {
    mocks.parseSearchParamsResult = {
      success: true,
      data: { page: 1, limit: 20, action: undefined, userId: "user-1" },
    };
    await GET(makeGetRequest({ userId: "user-1" }));
    expect(mocks.mockActivityLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      })
    );
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    const rateLimit = await import("@/lib/rate-limit");
    vi.mocked(rateLimit.checkRateLimit).mockReturnValueOnce({
      limited: true,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(429);
  });

  it("returns empty list when no logs exist", async () => {
    mocks.mockActivityLogFindMany.mockResolvedValue([]);
    mocks.mockActivityLogCount.mockResolvedValue(0);
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.logs).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it("handles db error gracefully", async () => {
    mocks.mockActivityLogFindMany.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });

  it("returns 400 on invalid params", async () => {
    mocks.parseSearchParamsResult = {
      success: false,
      errorResponse: NextResponse.json({ error: "Invalid params" }, { status: 400 }),
    };
    const res = await GET(makeGetRequest({ page: "invalid" }));
    expect(res.status).toBe(400);
  });
});
