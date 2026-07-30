import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserCount: vi.fn(),
    mockGroupCount: vi.fn(),
    mockAttemptCount: vi.fn(),
    mockNotificationCount: vi.fn(),
    mockDeadlineCount: vi.fn(),
    mockMessageCount: vi.fn(),
    mockUserFindMany: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockCreateRateLimitResponse: vi.fn(),
    mockGetClientIp: vi.fn(),
    adminGuardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      count: mocks.mockUserCount,
      findMany: mocks.mockUserFindMany,
    },
    group: { count: mocks.mockGroupCount },
    attempt: { count: mocks.mockAttemptCount },
    notification: { count: mocks.mockNotificationCount },
    deadline: { count: mocks.mockDeadlineCount },
    message: { count: mocks.mockMessageCount },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.mockCheckRateLimit,
  createRateLimitResponse: mocks.mockCreateRateLimitResponse,
  getClientIp: mocks.mockGetClientIp,
  rateLimits: { adminReportExport: { max: 5, windowMs: 60000 } },
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
  unwrapGuard: vi.fn(<T>(result: { session: T } | { response: NextResponse }): T => {
    if ("response" in result) {
      const err = new Error("Unauthorized") as Error & { statusCode: number };
      err.statusCode = result.response.status;
      throw err;
    }
    return (result as { session: T }).session;
  }),
}));

import { GET } from "./route";

function makeGetRequest(queryString = "") {
  const url = queryString
    ? `http://localhost:3000/api/admin/database/backup?${queryString}`
    : "http://localhost:3000/api/admin/database/backup";
  return new Request(url);
}

function setAdminAuthorized() {
  mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
}

function setAdminUnauthorized() {
  mocks.adminGuardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

describe("GET /api/admin/database/backup", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockUserCount.mockResolvedValue(100);
    mocks.mockGroupCount.mockResolvedValue(15);
    mocks.mockAttemptCount.mockResolvedValue(5000);
    mocks.mockNotificationCount.mockResolvedValue(8);
    mocks.mockDeadlineCount.mockResolvedValue(3);
    mocks.mockMessageCount.mockResolvedValue(200);
  });

  it("returns stats without params", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stats.users).toBe(100);
    expect(body.stats.groups).toBe(15);
    expect(body.stats.attempts).toBe(5000);
    expect(body.stats.unreadNotifications).toBe(8);
    expect(body.stats.activeDeadlines).toBe(3);
    expect(body.stats.totalMessages).toBe(200);
    expect(body.exportedAt).toBeDefined();
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    mocks.mockCheckRateLimit.mockReturnValue({ limited: true, resetAt: 99999 });
    mocks.mockCreateRateLimitResponse.mockReturnValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 })
    );
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(429);
  });

  it("returns error for table-specific SQLite dump", async () => {
    const res = await GET(makeGetRequest("format=sqlite&table=user"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("not supported");
  });

  it("returns error for unknown table", async () => {
    const res = await GET(makeGetRequest("table=unknown"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Unknown table");
  });

  it("exports table data in JSON format", async () => {
    const users = [{ id: "1", name: "Alice" }, { id: "2", name: "Bob" }];
    mocks.mockUserFindMany.mockResolvedValue(users);
    // Re-mock db.user with findMany for this test
    // The mock already delegates to mockUserFindMany for findMany
    // But user: { count: ..., findMany: ... } is in the db mock — we need to adjust
    // The db.user mock only has count. We need to add findMany support.
    // Let's check — our mock has user: { count: mocks.mockUserCount, findMany: mocks.mockUserFindMany }
    // but the route does (model as unknown as { findMany: ... }).findMany({}) for the modelMap[table]
    // which bypasses db.user entirely. So we need to mock the modelMap delegation differently.
    // The route looks up modelMap[table] which contains db.user, db.group, etc.
    // So when table=user, it calls (db.user as any).findMany({})
    // Our mock has user: { count: ..., findMany: ... }, so findMany should work.
    // But the route cast goes through 'as unknown as { findMany: ... }' which should work.

    const res = await GET(makeGetRequest("table=user"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.table).toBe("user");
    expect(body.rows).toHaveLength(2);
    expect(body.count).toBe(2);
    expect(body.exportedAt).toBeDefined();
  });
});
