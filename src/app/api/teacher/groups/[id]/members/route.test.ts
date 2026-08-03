import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockGroupFindUnique: vi.fn(),
    mockUserGroupFindMany: vi.fn(),
    mockUserGroupFindUnique: vi.fn(),
    mockUserGroupCreate: vi.fn(),
    mockUserGroupDelete: vi.fn(),
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
    group: { findUnique: mocks.mockGroupFindUnique },
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

import { GET, POST, DELETE } from "./route";

const groupId = "group-1";

function makeRequest(method: string, id: string, body?: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const init: RequestInit = { method, headers };
  if (body) init.body = JSON.stringify(body);
  return new Request(`http://localhost:3000/api/teacher/groups/${id}/members`, init);
}

function makeDeleteRequest(id: string, userId: string) {
  return new Request(
    `http://localhost:3000/api/teacher/groups/${id}/members?userId=${encodeURIComponent(userId)}`,
    { method: "DELETE", headers: { "Content-Type": "application/json" } }
  );
}

function setSession(role: string, userId: string) {
  mocks.guardResult = { session: { userId, role } };
}

describe("GET /api/teacher/groups/[id]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.mockGroupFindUnique.mockResolvedValue({ createdByUserId: "teacher-1" });
    mocks.mockUserGroupFindMany.mockResolvedValue([
      { userId: "u1", groupId, user: { id: "u1", name: "Alice", email: "a@t.com", role: "STUDENT" } },
      { userId: "u2", groupId, user: { id: "u2", name: "Bob", email: "b@t.com", role: "STUDENT" } },
    ]);
  });

  it("returns members of own group", async () => {
    const res = await GET(makeRequest("GET", groupId), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.members).toHaveLength(2);
    expect(body.members[0].email).toBe("a@t.com");
  });

  it("returns 403 when viewing another teacher's group", async () => {
    mocks.mockGroupFindUnique.mockResolvedValue({ createdByUserId: "teacher-2" });
    const res = await GET(makeRequest("GET", groupId), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when group not found", async () => {
    mocks.mockGroupFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("GET", groupId), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/teacher/groups/[id]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockGroupFindUnique.mockResolvedValue({ createdByUserId: "teacher-1" });
    mocks.mockUserGroupFindUnique.mockResolvedValue(null);
    mocks.mockUserGroupCreate.mockResolvedValue({ userId: "u1", groupId });
  });

  it("adds a member", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { userId: "u1" },
    });

    const res = await POST(makeRequest("POST", groupId, { userId: "u1" }), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(200);
    expect(mocks.mockUserGroupCreate).toHaveBeenCalledWith({
      data: { userId: "u1", groupId, assignedByUserId: "teacher-1" },
    });
  });

  it("returns 409 when user already a member", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { userId: "u1" },
    });
    mocks.mockUserGroupFindUnique.mockResolvedValue({ userId: "u1", groupId });

    const res = await POST(makeRequest("POST", groupId, { userId: "u1" }), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(409);
    expect(mocks.mockUserGroupCreate).not.toHaveBeenCalled();
  });

  it("returns 409 on race-condition duplicate (P2002)", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { userId: "u1" },
    });
    mocks.mockUserGroupFindUnique.mockResolvedValue(null);
    const { Prisma } = await import("@prisma/client");
    mocks.mockUserGroupCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.22.0",
      })
    );

    const res = await POST(makeRequest("POST", groupId, { userId: "u1" }), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(409);
  });

  it("re-throws non-P2002 create errors", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { userId: "u1" },
    });
    mocks.mockUserGroupFindUnique.mockResolvedValue(null);
    mocks.mockUserGroupCreate.mockRejectedValue(new Error("DB down"));

    const res = await POST(makeRequest("POST", groupId, { userId: "u1" }), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(500);
  });

  it("returns 404 when group not found", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { userId: "u1" },
    });
    mocks.mockGroupFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest("POST", groupId, { userId: "u1" }), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/teacher/groups/[id]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockGroupFindUnique.mockResolvedValue({ createdByUserId: "teacher-1" });
    mocks.mockUserGroupDelete.mockResolvedValue({ userId: "u1", groupId });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("removes a member", async () => {
    const res = await DELETE(makeDeleteRequest(groupId, "u1"), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(200);
    expect(mocks.mockUserGroupDelete).toHaveBeenCalledWith({
      where: { userId_groupId: { userId: "u1", groupId } },
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "GROUP_MEMBER_REMOVE" }),
      })
    );
  });

  it("returns 400 when userId missing", async () => {
    const res = await DELETE(makeRequest("DELETE", groupId), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(400);
    expect(mocks.mockUserGroupDelete).not.toHaveBeenCalled();
  });

  it("returns 403 when managing another teacher's group", async () => {
    mocks.mockGroupFindUnique.mockResolvedValue({ createdByUserId: "teacher-2" });
    const res = await DELETE(makeDeleteRequest(groupId, "u1"), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(403);
  });
});
