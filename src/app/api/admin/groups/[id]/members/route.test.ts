import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserGroupFindMany: vi.fn(),
    mockUserGroupFindUnique: vi.fn(),
    mockUserGroupCreate: vi.fn(),
    mockUserGroupDelete: vi.fn(),
    mockActivityLogCreate: vi.fn(),
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

vi.mock("@/lib/db", () => ({
  db: {
    userGroup: {
      findMany: mocks.mockUserGroupFindMany,
      findUnique: mocks.mockUserGroupFindUnique,
      create: mocks.mockUserGroupCreate,
      delete: mocks.mockUserGroupDelete,
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
  rateLimits: { adminGroupCrud: { max: 30, windowMs: 60000 } },
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
  unwrapGuard: vi.fn(<T>(result: { session: T } | { response: NextResponse }): T => {
    if ("response" in result) {
      const err = new Error("Unauthorized") as Error & { statusCode: number };
      err.statusCode = result.response.status;
      throw err;
    }
    return (result as { session: T }).session;
  }),
  parseRequestBody: vi.fn(),
}));

import { GET, POST, DELETE } from "./route";

function makeRequest(method: string, id: string, queryString = "", body?: Record<string, unknown>) {
  const url = queryString
    ? `http://localhost:3000/api/admin/groups/${id}/members?${queryString}`
    : `http://localhost:3000/api/admin/groups/${id}/members`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const init: RequestInit = { method, headers };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init);
}

function setAdminAuthorized() {
  mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
}

function setAdminUnauthorized() {
  mocks.adminGuardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

describe("GET /api/admin/groups/[id]/members", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.mockUserGroupFindMany.mockResolvedValue([
      { user: { id: "u1", name: "Alice", email: "a@t.com", role: "STUDENT" } },
      { user: { id: "u2", name: "Bob", email: "b@t.com", role: "STUDENT" } },
    ]);
  });

  it("returns group members", async () => {
    const res = await GET(makeRequest("GET", "group-1"), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.members).toHaveLength(2);
    expect(body.members[0].name).toBe("Alice");
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await GET(makeRequest("GET", "group-1"), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/groups/[id]/members", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockUserGroupFindUnique.mockResolvedValue(null);
    mocks.mockUserGroupCreate.mockResolvedValue({ id: "ug-1" });
  });

  it("adds a member to the group", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { userId: "u1" },
    });

    const res = await POST(makeRequest("POST", "group-1", "", { userId: "u1" }), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(200);
    expect(mocks.mockUserGroupCreate).toHaveBeenCalledWith({
      data: { userId: "u1", groupId: "group-1", assignedByUserId: "admin-1" },
    });
  });

  it("returns 409 when user is already a member", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { userId: "u1" },
    });
    mocks.mockUserGroupFindUnique.mockResolvedValue({ id: "ug-1" });

    const res = await POST(makeRequest("POST", "group-1", "", { userId: "u1" }), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(409);
  });

  it("returns 400 on invalid body", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: false,
      errorResponse: NextResponse.json({ error: "Invalid body" }, { status: 400 }),
    });

    const res = await POST(makeRequest("POST", "group-1", "", {}), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await POST(makeRequest("POST", "group-1", "", { userId: "u1" }), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/groups/[id]/members", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockUserGroupDelete.mockResolvedValue({ id: "ug-1" });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("removes a member from the group", async () => {
    const res = await DELETE(makeRequest("DELETE", "group-1", "userId=u1"), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(200);
    expect(mocks.mockUserGroupDelete).toHaveBeenCalledWith({
      where: { userId_groupId: { userId: "u1", groupId: "group-1" } },
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalled();
  });

  it("returns 400 when userId is missing", async () => {
    const res = await DELETE(makeRequest("DELETE", "group-1"), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await DELETE(makeRequest("DELETE", "group-1", "userId=u1"), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(403);
  });
});
