import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserFindUnique: vi.fn(),
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
  rateLimits: { adminUserRestore: { max: 20, windowMs: 60000 } },
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
}));

import { PATCH } from "./route";

function makeRequest(id: string) {
  return new Request(`http://localhost:3000/api/admin/users/${id}/restore`, {
    method: "PATCH",
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

describe("PATCH /api/admin/users/[id]/restore", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockUserFindUnique.mockResolvedValue({ id: "user-1", deletedAt: new Date("2024-05-01") });
    mocks.mockUserUpdate.mockResolvedValue({ id: "user-1", deletedAt: null });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("restores a deleted user", async () => {
    const res = await PATCH(makeRequest("user-1"), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mocks.mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ deletedAt: null }),
      })
    );
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "USER_RESTORE" }),
      })
    );
  });

  it("returns 404 when user not found", async () => {
    mocks.mockUserFindUnique.mockResolvedValue(null);
    const res = await PATCH(makeRequest("missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when user is not deleted", async () => {
    mocks.mockUserFindUnique.mockResolvedValue({ id: "user-1", deletedAt: null });
    const res = await PATCH(makeRequest("user-1"), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await PATCH(makeRequest("user-1"), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    mocks.mockCheckRateLimit.mockReturnValue({ limited: true, resetAt: 99999 });
    mocks.mockCreateRateLimitResponse.mockReturnValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 })
    );
    const res = await PATCH(makeRequest("user-1"), {
      params: Promise.resolve({ id: "user-1" }),
    });
    expect(res.status).toBe(429);
  });
});
