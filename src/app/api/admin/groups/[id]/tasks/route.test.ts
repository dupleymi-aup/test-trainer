import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockGroupFindUnique: vi.fn(),
    mockGroupTaskFindMany: vi.fn(),
    mockGroupTaskCreateMany: vi.fn(),
    mockGroupTaskDeleteMany: vi.fn(),
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
    },
    groupTask: {
      findMany: mocks.mockGroupTaskFindMany,
      createMany: mocks.mockGroupTaskCreateMany,
      deleteMany: mocks.mockGroupTaskDeleteMany,
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
import { tasks } from "@/lib/tasks";

const groupId = "group-1";

function makeRequest(method: string, id: string, body?: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const init: RequestInit = { method, headers };
  if (body) init.body = JSON.stringify(body);
  return new Request(`http://localhost:3000/api/admin/groups/${id}/tasks`, init);
}

function makeDeleteRequest(id: string, query = "") {
  return new Request(`http://localhost:3000/api/admin/groups/${id}/tasks?${query}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
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

const mockGroup = { id: groupId, name: "Group 1", description: "x", createdAt: new Date() };

describe("GET /api/admin/groups/[id]/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminAuthorized();
    mocks.mockGroupFindUnique.mockResolvedValue(mockGroup);
    mocks.mockGroupTaskFindMany.mockResolvedValue([
      { taskId: tasks[0]?.id ?? 1 },
      { taskId: tasks[1]?.id ?? 2 },
    ]);
  });

  it("returns all tasks with isAssigned flag", async () => {
    const res = await GET(makeRequest("GET", groupId), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks.length).toBe(tasks.length);
    const assigned = body.tasks.filter((t: { isAssigned: boolean }) => t.isAssigned);
    expect(assigned.length).toBe(2);
  });

  it("returns 404 when group not found", async () => {
    mocks.mockGroupFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("GET", "missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await GET(makeRequest("GET", groupId), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/groups/[id]/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockGroupFindUnique.mockResolvedValue(mockGroup);
    mocks.mockGroupTaskCreateMany.mockResolvedValue({ count: 2 });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("assigns tasks to the group", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    const taskIds = [tasks[0]?.id ?? 1, tasks[1]?.id ?? 2];
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { taskIds },
    });

    const res = await POST(makeRequest("POST", groupId, { taskIds }), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mocks.mockGroupTaskCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ groupId, taskId: taskIds[0] }),
      ]),
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "GROUP_TASKS_ASSIGN" }),
      })
    );
  });

  it("returns 400 for invalid task IDs", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { taskIds: [999999] },
    });

    const res = await POST(makeRequest("POST", groupId, { taskIds: [999999] }), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(400);
    expect(mocks.mockGroupTaskCreateMany).not.toHaveBeenCalled();
  });

  it("returns 404 when group not found", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { taskIds: [1] },
    });
    mocks.mockGroupFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest("POST", "missing", { taskIds: [1] }), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await POST(makeRequest("POST", groupId, { taskIds: [1] }), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/groups/[id]/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockGroupFindUnique.mockResolvedValue(mockGroup);
    mocks.mockGroupTaskDeleteMany.mockResolvedValue({ count: 1 });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("removes a single task via taskId query param", async () => {
    const res = await DELETE(makeDeleteRequest(groupId, "taskId=3"), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(200);
    expect(mocks.mockGroupTaskDeleteMany).toHaveBeenCalledWith({
      where: { groupId, taskId: 3 },
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "GROUP_TASKS_REMOVE" }),
      })
    );
  });

  it("returns 400 for invalid taskId", async () => {
    const res = await DELETE(makeDeleteRequest(groupId, "taskId=abc"), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(400);
    expect(mocks.mockGroupTaskDeleteMany).not.toHaveBeenCalled();
  });

  it("removes multiple tasks from body", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { taskIds: [4, 5] },
    });

    const res = await DELETE(makeDeleteRequest(groupId), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(200);
    expect(mocks.mockGroupTaskDeleteMany).toHaveBeenCalledWith({
      where: { groupId, taskId: { in: [4, 5] } },
    });
  });

  it("returns 404 when group not found", async () => {
    mocks.mockGroupFindUnique.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(groupId), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await DELETE(makeDeleteRequest(groupId), {
      params: Promise.resolve({ id: groupId }),
    });
    expect(res.status).toBe(403);
  });
});
