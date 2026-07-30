import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserFindMany: vi.fn(),
    mockActivityLogCreate: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockCreateRateLimitResponse: vi.fn(),
    mockGetClientIp: vi.fn(),
    loggerWarn: vi.fn(),
    adminGuardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: mocks.mockUserFindMany,
    },
    activityLog: {
      create: mocks.mockActivityLogCreate,
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.mockCheckRateLimit,
  createRateLimitResponse: mocks.mockCreateRateLimitResponse,
  getClientIp: mocks.mockGetClientIp,
  rateLimits: { adminReportExport: { max: 5, windowMs: 60000 } },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: mocks.loggerWarn,
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

function makeGetRequest(queryString = "") {
  const url = queryString
    ? `http://localhost:3000/api/admin/users/export?${queryString}`
    : "http://localhost:3000/api/admin/users/export";
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

const mockUsers = [
  {
    id: "1", name: "Alice", email: "alice@test.com", phone: "+7-999-111-22-33",
    role: "STUDENT", isActive: true, university: "MGU", group: "MGU-101",
    createdAt: new Date("2024-01-15"), updatedAt: new Date("2024-06-01"),
    _count: { attempts: 10 },
  },
  {
    id: "2", name: "Bob", email: "bob@test.com", phone: null,
    role: "TEACHER", isActive: true, university: null, group: null,
    createdAt: new Date("2024-02-20"), updatedAt: new Date("2024-06-15"),
    _count: { attempts: 0 },
  },
];

describe("GET /api/admin/users/export", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockUserFindMany.mockResolvedValue(mockUsers);
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("exports users as JSON by default", async () => {
    const res = await GET(makeGetRequest("format=json"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(2);
    expect(body.users).toHaveLength(2);
    expect(body.users[0].name).toBe("Alice");
    expect(body.exportedAt).toBeDefined();
    expect(mocks.mockActivityLogCreate).toHaveBeenCalled();
  });

  it("exports users as CSV", async () => {
    const res = await GET(makeGetRequest("format=csv"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Alice");
    expect(text).toContain("Bob");
    expect(text).toContain("MGU-101");
    expect(text).toContain("ID,Имя,Email");
    expect(mocks.mockActivityLogCreate).toHaveBeenCalled();
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

  it("handles db error gracefully", async () => {
    mocks.mockUserFindMany.mockRejectedValue(new Error("DB connection failed"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});
