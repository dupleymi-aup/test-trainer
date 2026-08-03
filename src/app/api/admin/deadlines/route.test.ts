import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockDeadlineFindMany: vi.fn(),
    mockDeadlineCreate: vi.fn(),
    mockDeadlineUpdate: vi.fn(),
    mockDeadlineDelete: vi.fn(),
    mockUserFindMany: vi.fn(),
    mockUserGroupFindMany: vi.fn(),
    mockReminderCreateMany: vi.fn(),
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
    deadline: {
      findMany: mocks.mockDeadlineFindMany,
      create: mocks.mockDeadlineCreate,
      update: mocks.mockDeadlineUpdate,
      delete: mocks.mockDeadlineDelete,
    },
    user: {
      findMany: mocks.mockUserFindMany,
    },
    userGroup: {
      findMany: mocks.mockUserGroupFindMany,
    },
    reminder: {
      createMany: mocks.mockReminderCreateMany,
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
  rateLimits: { adminDeadlineCrud: { max: 30, windowMs: 60000 } },
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

import { GET, POST, PATCH, DELETE } from "./route";

function makeRequest(method: string, queryString = "", body?: Record<string, unknown>) {
  const url = queryString
    ? `http://localhost:3000/api/admin/deadlines?${queryString}`
    : "http://localhost:3000/api/admin/deadlines";
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

const mockDeadline = {
  id: "dl-1",
  title: "Test 1",
  description: "Exam",
  dueDate: new Date("2024-08-01"),
  type: "EXAM",
  group: null,
  creator: { id: "admin-1", name: "Admin", email: "a@t.com" },
  _count: { reminders: 5 },
};

describe("GET /api/admin/deadlines", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.mockDeadlineFindMany.mockResolvedValue([mockDeadline]);
  });

  it("returns deadlines (future only by default)", async () => {
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deadlines).toHaveLength(1);
    expect(mocks.mockDeadlineFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { dueDate: { gte: expect.any(Date) } } })
    );
  });

  it("includes past deadlines when showPast=true", async () => {
    const res = await GET(makeRequest("GET", "showPast=true"));
    expect(res.status).toBe(200);
    expect(mocks.mockDeadlineFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it("filters by type and group", async () => {
    const res = await GET(makeRequest("GET", "type=EXAM&groupId=g1"));
    expect(res.status).toBe(200);
    expect(mocks.mockDeadlineFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "EXAM", groupId: "g1" }),
      })
    );
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/deadlines", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockDeadlineCreate.mockResolvedValue({ ...mockDeadline, dueDate: new Date("2024-08-01") });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("creates a deadline with reminders for all students", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: {
        title: "Test 1",
        dueDate: "2024-08-01T10:00:00Z",
        type: "EXAM",
        targetUsers: "ALL_STUDENTS",
      },
    });
    mocks.mockUserFindMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
    mocks.mockReminderCreateMany.mockResolvedValue({ count: 2 });

    const res = await POST(makeRequest("POST", "", {
      title: "Test 1", dueDate: "2024-08-01T10:00:00Z", type: "EXAM", targetUsers: "ALL_STUDENTS",
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.remindersCount).toBe(2);
    expect(mocks.mockReminderCreateMany).toHaveBeenCalledWith({
      data: [
        { deadlineId: "dl-1", userId: "u1" },
        { deadlineId: "dl-1", userId: "u2" },
      ],
    });
  });

  it("creates reminders for group members", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: {
        title: "Test 1",
        dueDate: "2024-08-01T10:00:00Z",
        type: "TEST",
        groupId: "g1",
        targetUsers: "GROUP_MEMBERS",
      },
    });
    mocks.mockUserGroupFindMany.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);

    const res = await POST(makeRequest("POST", "", {
      title: "Test 1", dueDate: "2024-08-01T10:00:00Z", type: "TEST", groupId: "g1", targetUsers: "GROUP_MEMBERS",
    }));
    expect(res.status).toBe(201);
    expect(mocks.mockUserGroupFindMany).toHaveBeenCalledWith({
      where: { groupId: "g1" },
      select: { userId: true },
    });
  });

  it("returns 400 on invalid body", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: false,
      errorResponse: NextResponse.json({ error: "Invalid body" }, { status: 400 }),
    });

    const res = await POST(makeRequest("POST", "", {}));
    expect(res.status).toBe(400);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await POST(makeRequest("POST", "", { title: "x", dueDate: "2024-08-01T10:00:00Z", type: "EXAM" }));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/deadlines", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockDeadlineUpdate.mockResolvedValue(mockDeadline);
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("updates a deadline", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { title: "Updated", reminderSchedule: [24, 48] },
    });

    const res = await PATCH(makeRequest("PATCH", "id=dl-1", { title: "Updated" }));
    expect(res.status).toBe(200);
    expect(mocks.mockDeadlineUpdate).toHaveBeenCalledWith({
      where: { id: "dl-1" },
      data: expect.objectContaining({
        title: "Updated",
        reminderSchedule: JSON.stringify([24, 48]),
      }),
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalled();
  });

  it("returns 400 when id is missing", async () => {
    const res = await PATCH(makeRequest("PATCH", "", { title: "x" }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await PATCH(makeRequest("PATCH", "id=dl-1", { title: "x" }));
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/deadlines", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockDeadlineDelete.mockResolvedValue(mockDeadline);
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("deletes a deadline", async () => {
    const res = await DELETE(makeRequest("DELETE", "id=dl-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mocks.mockDeadlineDelete).toHaveBeenCalledWith({ where: { id: "dl-1" } });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalled();
  });

  it("returns 400 when id is missing", async () => {
    const res = await DELETE(makeRequest("DELETE"));
    expect(res.status).toBe(400);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await DELETE(makeRequest("DELETE", "id=dl-1"));
    expect(res.status).toBe(403);
  });
});
