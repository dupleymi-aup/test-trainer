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
    guardResult: null as
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
  rateLimits: { teacherGroupCrud: { max: 30, windowMs: 60000 } },
}));

vi.mock("@/lib/admin-guard", () => {
  const m = mocks;
  return {
    requireTeacherOrAdmin: vi.fn().mockImplementation(async () => {
      if (m.guardResult) return m.guardResult;
      return { session: { userId: "teacher-1", role: "TEACHER" } };
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

const groupId = "group-1";

function makeRequest(method: string, id: string, body?: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const init: RequestInit = { method, headers };
  if (body) init.body = JSON.stringify(body);
  return new Request(`http://localhost:3000/api/teacher/groups/${id}`, init);
}

function setSession(role: string, userId: string) {
  mocks.guardResult = { session: { userId, role } };
}

describe("PATCH /api/teacher/groups/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockGroupFindUnique.mockResolvedValue({ createdByUserId: "teacher-1" });
    mocks.mockGroupUpdate.mockResolvedValue({ id: groupId, name: "New Name" });
  });

  it("updates own group", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { name: "New Name" },
    });

    const res = await PATCH(makeRequest("PATCH", groupId, { name: "New Name" }), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.group.name).toBe("New Name");
    expect(mocks.mockGroupUpdate).toHaveBeenCalledWith({
      where: { id: groupId },
      data: { name: "New Name" },
      include: expect.objectContaining({ _count: { select: { members: true } } }),
    });
  });

  it("allows admin to update any group", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { name: "Admin Edit" },
    });
    setSession("ADMIN", "admin-1");
    mocks.mockGroupFindUnique.mockResolvedValue({ createdByUserId: "teacher-1" });

    const res = await PATCH(makeRequest("PATCH", groupId, { name: "Admin Edit" }), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 403 when editing another teacher's group", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { name: "Hijack" },
    });
    mocks.mockGroupFindUnique.mockResolvedValue({ createdByUserId: "teacher-2" });

    const res = await PATCH(makeRequest("PATCH", groupId, { name: "Hijack" }), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(403);
    expect(mocks.mockGroupUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when group not found", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { name: "X" },
    });
    mocks.mockGroupFindUnique.mockResolvedValue(null);

    const res = await PATCH(makeRequest("PATCH", groupId, { name: "X" }), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when unauthorized", async () => {
    mocks.guardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    const res = await PATCH(makeRequest("PATCH", groupId, { name: "X" }), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/teacher/groups/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockGroupFindUnique.mockResolvedValue({
      createdByUserId: "teacher-1",
      name: "Group 1",
    });
    mocks.mockGroupDelete.mockResolvedValue({ id: groupId });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("deletes own group with activity log", async () => {
    const res = await DELETE(makeRequest("DELETE", groupId), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mocks.mockGroupDelete).toHaveBeenCalledWith({ where: { id: groupId } });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "GROUP_DELETE",
          entityId: groupId,
          ipAddress: "127.0.0.1",
        }),
      })
    );
  });

  it("returns 403 when deleting another teacher's group", async () => {
    mocks.mockGroupFindUnique.mockResolvedValue({
      createdByUserId: "teacher-2",
      name: "Other Group",
    });
    const res = await DELETE(makeRequest("DELETE", groupId), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(403);
    expect(mocks.mockGroupDelete).not.toHaveBeenCalled();
  });

  it("returns 404 when group not found", async () => {
    mocks.mockGroupFindUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE", groupId), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when unauthorized", async () => {
    mocks.guardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    const res = await DELETE(makeRequest("DELETE", groupId), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(403);
  });
});
