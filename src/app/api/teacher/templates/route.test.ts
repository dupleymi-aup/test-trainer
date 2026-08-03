import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockCourseTemplateFindMany: vi.fn(),
    mockCourseTemplateCreate: vi.fn(),
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
    courseTemplate: {
      findMany: mocks.mockCourseTemplateFindMany,
      create: mocks.mockCourseTemplateCreate,
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
  rateLimits: { teacherTemplateCrud: { max: 30, windowMs: 60000 } },
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

import { GET, POST } from "./route";

function makeRequest(method: string, body?: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const init: RequestInit = { method, headers };
  if (body) init.body = JSON.stringify(body);
  return new Request("http://localhost:3000/api/teacher/templates", init);
}

function setSession(role: string, userId: string) {
  mocks.guardResult = { session: { userId, role } };
}

const mockTemplate = {
  id: "tpl-1",
  name: "Course 1",
  description: "desc",
  taskIds: "[1,2,3]",
  topics: null,
  estimatedHours: 20,
  createdByUserId: "teacher-1",
  createdAt: new Date(),
  createdBy: { id: "teacher-1", name: "Teacher" },
  assignments: [],
};

describe("GET /api/teacher/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.mockCourseTemplateFindMany.mockResolvedValue([mockTemplate]);
  });

  it("returns own templates for teacher", async () => {
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.templates).toHaveLength(1);
    expect(mocks.mockCourseTemplateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdByUserId: "teacher-1" } })
    );
  });

  it("returns all templates for admin", async () => {
    setSession("ADMIN", "admin-1");
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    expect(mocks.mockCourseTemplateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it("returns 403 when unauthorized", async () => {
    mocks.guardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/teacher/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockCourseTemplateCreate.mockResolvedValue({ ...mockTemplate, id: "tpl-new" });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("creates a template", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { name: "New Course", description: "desc", taskIds: [1, 2], topics: ["SQL"], estimatedHours: 10 },
    });

    const res = await POST(makeRequest("POST", { name: "New Course", taskIds: [1, 2] }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.template.id).toBe("tpl-new");
    expect(mocks.mockCourseTemplateCreate).toHaveBeenCalledWith({
      data: {
        name: "New Course",
        description: "desc",
        taskIds: JSON.stringify([1, 2]),
        topics: JSON.stringify(["SQL"]),
        estimatedHours: 10,
        createdByUserId: "teacher-1",
      },
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "TEMPLATE_CREATE" }),
      })
    );
  });

  it("creates a template without optional fields", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { name: "Minimal", taskIds: [5] },
    });

    const res = await POST(makeRequest("POST", { name: "Minimal", taskIds: [5] }));
    expect(res.status).toBe(201);
    expect(mocks.mockCourseTemplateCreate).toHaveBeenCalledWith({
      data: {
        name: "Minimal",
        description: null,
        taskIds: "[5]",
        topics: null,
        estimatedHours: null,
        createdByUserId: "teacher-1",
      },
    });
  });

  it("returns 403 when unauthorized", async () => {
    mocks.guardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    const res = await POST(makeRequest("POST", { name: "X", taskIds: [1] }));
    expect(res.status).toBe(403);
  });
});
