import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserFindUnique: vi.fn(),
    mockUserFindFirst: vi.fn(),
    mockUserUpdate: vi.fn(),
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
    user: {
      findUnique: mocks.mockUserFindUnique,
      findFirst: mocks.mockUserFindFirst,
      update: mocks.mockUserUpdate,
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
  rateLimits: { adminUserCrud: { max: 30, windowMs: 60000 } },
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

import { GET, PATCH, DELETE } from "./route";

function makeRequest(method: string, id: string, body?: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const init: RequestInit = { method, headers };
  if (body) init.body = JSON.stringify(body);
  return new Request(`http://localhost:3000/api/admin/users/${id}`, init);
}

function setAdminAuthorized(userId = "admin-1") {
  mocks.adminGuardResult = { session: { userId, role: "ADMIN" } };
}

function setAdminUnauthorized() {
  mocks.adminGuardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

const mockUser = {
  id: "user-1",
  name: "Alice",
  email: "alice@test.com",
  phone: "+7-999-111-22-33",
  role: "STUDENT",
  isActive: true,
  deletedAt: null,
  avatar: null,
  bio: null,
  university: "MGU",
  group: "MGU-101",
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-06-01"),
  _count: { attempts: 10, activityLogs: 5, groups: 2 },
};

describe("GET /api/admin/users/[id]", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.mockUserFindUnique.mockResolvedValue(mockUser);
  });

  it("returns user details", async () => {
    const res = await GET(makeRequest("GET", "user-1"), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.name).toBe("Alice");
    expect(body.user._count.attempts).toBe(10);
  });

  it("returns 404 when user not found", async () => {
    mocks.mockUserFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("GET", "missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await GET(makeRequest("GET", "user-1"), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/users/[id]", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockUserFindUnique.mockResolvedValue(mockUser);
    mocks.mockUserFindFirst.mockResolvedValue(null);
    mocks.mockUserUpdate.mockResolvedValue({ ...mockUser, name: "Alice Updated" });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("updates a user", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { name: "Alice Updated" },
    });

    const res = await PATCH(makeRequest("PATCH", "user-1", { name: "Alice Updated" }), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.name).toBe("Alice Updated");
    expect(mocks.mockActivityLogCreate).toHaveBeenCalled();
  });

  it("returns 409 when email is taken", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { email: "taken@test.com" },
    });
    mocks.mockUserFindFirst.mockResolvedValue({ id: "other-user" });

    const res = await PATCH(makeRequest("PATCH", "user-1", { email: "taken@test.com" }), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(409);
  });

  it("returns 409 when phone is taken", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { phone: "+7-999-000-00-00" },
    });
    mocks.mockUserFindFirst.mockResolvedValue({ id: "other-user" });

    const res = await PATCH(makeRequest("PATCH", "user-1", { phone: "+7-999-000-00-00" }), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(409);
  });

  it("returns 404 when user not found", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { name: "X" },
    });
    mocks.mockUserFindUnique.mockResolvedValue(null);

    const res = await PATCH(makeRequest("PATCH", "missing", { name: "X" }), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when user is deleted", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { name: "X" },
    });
    mocks.mockUserFindUnique.mockResolvedValue({ ...mockUser, deletedAt: new Date("2024-05-01") });

    const res = await PATCH(makeRequest("PATCH", "user-1", { name: "X" }), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await PATCH(makeRequest("PATCH", "user-1", { name: "X" }), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/users/[id]", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockUserFindUnique.mockResolvedValue(mockUser);
    mocks.mockUserUpdate.mockResolvedValue({ ...mockUser, deletedAt: new Date() });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("soft-deletes a user", async () => {
    const res = await DELETE(makeRequest("DELETE", "user-1"), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mocks.mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "USER_DELETE" }),
      })
    );
  });

  it("returns 400 when deleting own account", async () => {
    setAdminAuthorized("user-1");
    const res = await DELETE(makeRequest("DELETE", "user-1"), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    mocks.mockUserFindUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE", "missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when user already deleted", async () => {
    mocks.mockUserFindUnique.mockResolvedValue({ ...mockUser, deletedAt: new Date("2024-05-01") });
    const res = await DELETE(makeRequest("DELETE", "user-1"), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await DELETE(makeRequest("DELETE", "user-1"), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(403);
  });
});
