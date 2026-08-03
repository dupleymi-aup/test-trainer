import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockGroupFindUnique: vi.fn(),
    mockGroupUpdate: vi.fn(),
    mockGroupDelete: vi.fn(),
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
    group: {
      findUnique: mocks.mockGroupFindUnique,
      update: mocks.mockGroupUpdate,
      delete: mocks.mockGroupDelete,
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

import { PATCH, DELETE } from "./route";

function makeRequest(method: string, id: string, body?: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const init: RequestInit = { method, headers };
  if (body) init.body = JSON.stringify(body);
  return new Request(`http://localhost:3000/api/admin/groups/${id}`, init);
}

function setAdminAuthorized() {
  mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
}

function setAdminUnauthorized() {
  mocks.adminGuardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

const mockGroup = {
  id: "group-1",
  name: "MGU-101",
  description: "Group A",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-06-01"),
  _count: { members: 25 },
};

describe("PATCH /api/admin/groups/[id]", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockGroupFindUnique.mockResolvedValue(mockGroup);
    mocks.mockGroupUpdate.mockResolvedValue({ ...mockGroup, name: "Updated" });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("updates a group", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { name: "Updated" },
    });

    const res = await PATCH(makeRequest("PATCH", "group-1", { name: "Updated" }), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.group.name).toBe("Updated");
    expect(mocks.mockGroupUpdate).toHaveBeenCalledWith({
      where: { id: "group-1" },
      data: { name: "Updated" },
      include: { _count: { select: { members: true } } },
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalled();
  });

  it("returns 404 when group not found", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { name: "Updated" },
    });
    mocks.mockGroupFindUnique.mockResolvedValue(null);

    const res = await PATCH(makeRequest("PATCH", "missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await PATCH(makeRequest("PATCH", "group-1"), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    mocks.mockCheckRateLimit.mockReturnValue({ limited: true, resetAt: 99999 });
    mocks.mockCreateRateLimitResponse.mockReturnValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 })
    );
    const res = await PATCH(makeRequest("PATCH", "group-1"), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid body", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: false,
      errorResponse: NextResponse.json({ error: "Invalid body" }, { status: 400 }),
    });
    const res = await PATCH(makeRequest("PATCH", "group-1", { name: "" }), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/admin/groups/[id]", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockGroupFindUnique.mockResolvedValue(mockGroup);
    mocks.mockGroupDelete.mockResolvedValue(mockGroup);
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("deletes a group", async () => {
    const res = await DELETE(makeRequest("DELETE", "group-1"), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mocks.mockGroupDelete).toHaveBeenCalledWith({ where: { id: "group-1" } });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalled();
  });

  it("returns 404 when group not found", async () => {
    mocks.mockGroupFindUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE", "missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await DELETE(makeRequest("DELETE", "group-1"), {
      params: Promise.resolve({ id: "group-1" }),
    });
    expect(res.status).toBe(403);
  });
});
