import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockCustomTaskFindMany: vi.fn(),
    mockCustomTaskCreate: vi.fn(),
    mockCustomTaskFindUnique: vi.fn(),
    mockCustomTaskDelete: vi.fn(),
    mockGroupFindMany: vi.fn(),
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
    customTask: {
      findMany: mocks.mockCustomTaskFindMany,
      create: mocks.mockCustomTaskCreate,
      findUnique: mocks.mockCustomTaskFindUnique,
      delete: mocks.mockCustomTaskDelete,
    },
    group: { findMany: mocks.mockGroupFindMany },
    activityLog: { create: mocks.mockActivityLogCreate },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.mockCheckRateLimit,
  createRateLimitResponse: mocks.mockCreateRateLimitResponse,
  getClientIp: mocks.mockGetClientIp,
  rateLimits: { teacherTaskConstructor: { max: 30, windowMs: 60000 } },
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

function makeRequest(method: string, query = "", body?: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const init: RequestInit = { method, headers };
  if (body) init.body = JSON.stringify(body);
  return new Request(`http://localhost:3000/api/teacher/task-constructor${query}`, init);
}

function setSession(role: string, userId: string) {
  mocks.guardResult = { session: { userId, role } };
}

const mockTask = {
  id: "ct1",
  name: "Sum function",
  difficulty: "Easy",
  signature: "int sum(int a, int b)",
  description: "Return sum",
  returnType: "int",
  topics: '["math"]',
  parameters: '[{"name":"a","type":"int"}]',
  ecClasses: '[{"className":"SumClass","ecLabel":"EC1"}]',
  bvValues: '[{"value":"1+2","description":"basic"}]',
  code: "return a+b;",
  commonMistakes: '["no return"]',
  createdById: "teacher-1",
  createdBy: { id: "teacher-1", name: "Teacher" },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GET /api/teacher/task-constructor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.mockCustomTaskFindMany.mockResolvedValue([mockTask]);
    mocks.mockGroupFindMany.mockResolvedValue([{ id: "g1" }]);
  });

  it("returns own tasks with parsed JSON fields", async () => {
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks).toHaveLength(1);
    const t = body.tasks[0];
    expect(t.topics).toEqual(["math"]);
    expect(t.parameters).toEqual([{ name: "a", type: "int" }]);
    expect(t.commonMistakes).toEqual(["no return"]);
    expect(body.groupIds).toEqual(["g1"]);
    expect(mocks.mockCustomTaskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdById: "teacher-1" } })
    );
  });

  it("returns 403 when unauthorized", async () => {
    mocks.guardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/teacher/task-constructor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockCustomTaskCreate.mockResolvedValue(mockTask);
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("creates a custom task", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: {
        name: "Sum function",
        difficulty: "Easy",
        signature: "int sum(int a, int b)",
        description: "Return sum",
        returnType: "int",
        topics: ["math"],
        parameters: [{ name: "a", type: "int" }],
        ecClasses: [{ className: "SumClass", ecLabel: "EC1", description: "x", exampleValues: ["1"] }],
        bvValues: [{ value: "1+2", description: "basic" }],
        code: "return a+b;",
        commonMistakes: ["no return"],
        groupId: "g1",
      },
    });

    const res = await POST(makeRequest("POST", "", { name: "Sum", difficulty: "Easy" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.task.topics).toEqual(["math"]);
    expect(mocks.mockCustomTaskCreate).toHaveBeenCalledWith({
      data: {
        name: "Sum function",
        difficulty: "Easy",
        signature: "int sum(int a, int b)",
        description: "Return sum",
        returnType: "int",
        topics: '["math"]',
        parameters: '[{"name":"a","type":"int"}]',
        ecClasses: JSON.stringify([{ className: "SumClass", ecLabel: "EC1", description: "x", exampleValues: ["1"] }]),
        bvValues: '[{"value":"1+2","description":"basic"}]',
        code: "return a+b;",
        commonMistakes: '["no return"]',
        createdById: "teacher-1",
      },
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "CUSTOM_TASK_CREATE" }),
      })
    );
  });
});

describe("DELETE /api/teacher/task-constructor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockCustomTaskFindUnique.mockResolvedValue({ createdById: "teacher-1" });
    mocks.mockCustomTaskDelete.mockResolvedValue(mockTask);
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("deletes own task", async () => {
    const res = await DELETE(makeRequest("DELETE", "?id=ct1"));
    expect(res.status).toBe(200);
    expect(mocks.mockCustomTaskDelete).toHaveBeenCalledWith({ where: { id: "ct1" } });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "CUSTOM_TASK_DELETE" }),
      })
    );
  });

  it("returns 400 when id missing", async () => {
    const res = await DELETE(makeRequest("DELETE"));
    expect(res.status).toBe(400);
  });

  it("returns 403 when deleting another teacher's task", async () => {
    mocks.mockCustomTaskFindUnique.mockResolvedValue({ createdById: "teacher-2" });
    const res = await DELETE(makeRequest("DELETE", "?id=ct1"));
    expect(res.status).toBe(403);
    expect(mocks.mockCustomTaskDelete).not.toHaveBeenCalled();
  });

  it("returns 404 when task not found", async () => {
    mocks.mockCustomTaskFindUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE", "?id=ct1"));
    expect(res.status).toBe(404);
  });
});
