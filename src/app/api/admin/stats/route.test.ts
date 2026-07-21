import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserCount: vi.fn(),
    mockUserGroupBy: vi.fn(),
    mockAttemptCount: vi.fn(),
    mockGroupCount: vi.fn(),
    mockActivityLogFindMany: vi.fn(),
    loggerError: vi.fn(),
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
      groupBy: mocks.mockUserGroupBy,
    },
    attempt: {
      count: mocks.mockAttemptCount,
    },
    group: {
      count: mocks.mockGroupCount,
    },
    activityLog: {
      findMany: mocks.mockActivityLogFindMany,
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

function makeGetRequest() {
  return new Request("http://localhost:3000/api/admin/stats");
}

function setAdminAuthorized() {
  mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
}

function setAdminUnauthorized() {
  mocks.adminGuardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

const mockActivityLog = [
  {
    id: "log-1",
    userId: "user-1",
    action: "LOGIN",
    entity: "User",
    createdAt: new Date("2024-06-01T10:00:00Z"),
    user: { name: "John", email: "john@test.com", role: "STUDENT" },
  },
];

describe("GET /api/admin/stats", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.mockUserCount.mockResolvedValue(100);
    mocks.mockUserGroupBy.mockResolvedValue([
      { role: "ADMIN", _count: 2 },
      { role: "TEACHER", _count: 10 },
      { role: "STUDENT", _count: 88 },
    ]);
    mocks.mockAttemptCount.mockResolvedValue(5000);
    mocks.mockGroupCount.mockResolvedValue(15);
    mocks.mockActivityLogFindMany.mockResolvedValue(mockActivityLog);
  });

  it("returns aggregated stats", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalUsers).toBe(100);
    expect(body.usersByRole).toEqual({ ADMIN: 2, TEACHER: 10, STUDENT: 88 });
    expect(body.totalAttempts).toBe(5000);
    expect(body.totalGroups).toBe(15);
    expect(body.recentActivity).toHaveLength(1);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("handles db error gracefully", async () => {
    mocks.mockUserCount.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});
