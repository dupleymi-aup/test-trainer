import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockCourseTemplateFindUnique: vi.fn(),
    mockCourseTemplateUpdate: vi.fn(),
    mockCourseTemplateDelete: vi.fn(),
    mockTemplateAssignmentUpsert: vi.fn(),
    mockTemplateAssignmentDeleteMany: vi.fn(),
    mockGroupTaskUpsert: vi.fn(),
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
      findUnique: mocks.mockCourseTemplateFindUnique,
      update: mocks.mockCourseTemplateUpdate,
      delete: mocks.mockCourseTemplateDelete,
    },
    templateAssignment: {
      upsert: mocks.mockTemplateAssignmentUpsert,
      deleteMany: mocks.mockTemplateAssignmentDeleteMany,
    },
    groupTask: {
      upsert: mocks.mockGroupTaskUpsert,
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

import { GET, PATCH, DELETE } from "./route";

const templateId = "tpl-1";

function makeRequest(method: string, id: string, body?: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const init: RequestInit = { method, headers };
  if (body) init.body = JSON.stringify(body);
  return new Request(`http://localhost:3000/api/teacher/templates/${id}`, init);
}

function setSession(role: string, userId: string) {
  mocks.guardResult = { session: { userId, role } };
}

const mockTemplate = {
  id: templateId,
  name: "Course 1",
  description: "desc",
  taskIds: "[1,2]",
  topics: null,
  estimatedHours: 20,
  createdByUserId: "teacher-1",
  createdAt: new Date(),
  createdBy: { id: "teacher-1", name: "Teacher" },
  assignments: [],
};

describe("GET /api/teacher/templates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.mockCourseTemplateFindUnique.mockResolvedValue(mockTemplate);
  });

  it("returns own template", async () => {
    const res = await GET(makeRequest("GET", templateId), {
      params: Promise.resolve({ id: templateId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.template.name).toBe("Course 1");
  });

  it("returns 403 when accessing another teacher's template", async () => {
    mocks.mockCourseTemplateFindUnique.mockResolvedValue({
      ...mockTemplate,
      createdByUserId: "teacher-2",
    });
    const res = await GET(makeRequest("GET", templateId), {
      params: Promise.resolve({ id: templateId }),
    });
    expect(res.status).toBe(403);
  });

  it("allows admin to access any template", async () => {
    setSession("ADMIN", "admin-1");
    mocks.mockCourseTemplateFindUnique.mockResolvedValue({
      ...mockTemplate,
      createdByUserId: "teacher-2",
    });
    const res = await GET(makeRequest("GET", templateId), {
      params: Promise.resolve({ id: templateId }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 404 when template not found", async () => {
    mocks.mockCourseTemplateFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("GET", templateId), {
      params: Promise.resolve({ id: templateId }),
    });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/teacher/templates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockCourseTemplateFindUnique.mockResolvedValue(mockTemplate);
    mocks.mockCourseTemplateUpdate.mockResolvedValue(mockTemplate);
    mocks.mockTemplateAssignmentUpsert.mockResolvedValue({ id: "ta-1" });
    mocks.mockGroupTaskUpsert.mockResolvedValue({ id: "gt-1" });
  });

  it("updates template fields", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { name: "Updated", taskIds: [3, 4] },
    });

    const res = await PATCH(makeRequest("PATCH", templateId, { name: "Updated" }), {
      params: Promise.resolve({ id: templateId }),
    });
    expect(res.status).toBe(200);
    expect(mocks.mockCourseTemplateUpdate).toHaveBeenCalledWith({
      where: { id: templateId },
      data: { name: "Updated", taskIds: "[3,4]" },
    });
  });

  it("assigns template to group and syncs tasks", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { assignToGroupId: "g1", taskIds: [1, 2] },
    });

    const res = await PATCH(makeRequest("PATCH", templateId, { assignToGroupId: "g1" }), {
      params: Promise.resolve({ id: templateId }),
    });
    expect(res.status).toBe(200);
    expect(mocks.mockTemplateAssignmentUpsert).toHaveBeenCalledWith({
      where: { templateId_groupId: { templateId, groupId: "g1" } },
      create: { templateId, groupId: "g1" },
      update: {},
    });
    expect(mocks.mockGroupTaskUpsert).toHaveBeenCalledTimes(2);
  });

  it("removes assignment when assignToGroupId is null", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { assignToGroupId: null },
    });

    const res = await PATCH(makeRequest("PATCH", templateId, { assignToGroupId: null }), {
      params: Promise.resolve({ id: templateId }),
    });
    expect(res.status).toBe(200);
    expect(mocks.mockTemplateAssignmentDeleteMany).toHaveBeenCalledWith({
      where: { templateId },
    });
  });

  it("returns 403 when editing another teacher's template", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { name: "Hijack" },
    });
    mocks.mockCourseTemplateFindUnique.mockResolvedValue({
      ...mockTemplate,
      createdByUserId: "teacher-2",
    });

    const res = await PATCH(makeRequest("PATCH", templateId, { name: "Hijack" }), {
      params: Promise.resolve({ id: templateId }),
    });
    expect(res.status).toBe(403);
    expect(mocks.mockCourseTemplateUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when template not found", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { name: "X" },
    });
    mocks.mockCourseTemplateFindUnique.mockResolvedValue(null);

    const res = await PATCH(makeRequest("PATCH", templateId, { name: "X" }), {
      params: Promise.resolve({ id: templateId }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/teacher/templates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockCourseTemplateFindUnique.mockResolvedValue(mockTemplate);
    mocks.mockTemplateAssignmentDeleteMany.mockResolvedValue({ count: 1 });
    mocks.mockCourseTemplateDelete.mockResolvedValue(mockTemplate);
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("deletes template and cleans up assignments", async () => {
    const res = await DELETE(makeRequest("DELETE", templateId), {
      params: Promise.resolve({ id: templateId }),
    });
    expect(res.status).toBe(200);
    expect(mocks.mockTemplateAssignmentDeleteMany).toHaveBeenCalledWith({
      where: { templateId },
    });
    expect(mocks.mockCourseTemplateDelete).toHaveBeenCalledWith({
      where: { id: templateId },
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "TEMPLATE_DELETE" }),
      })
    );
  });

  it("returns 403 when deleting another teacher's template", async () => {
    mocks.mockCourseTemplateFindUnique.mockResolvedValue({
      ...mockTemplate,
      createdByUserId: "teacher-2",
    });
    const res = await DELETE(makeRequest("DELETE", templateId), {
      params: Promise.resolve({ id: templateId }),
    });
    expect(res.status).toBe(403);
    expect(mocks.mockCourseTemplateDelete).not.toHaveBeenCalled();
  });

  it("returns 404 when template not found", async () => {
    mocks.mockCourseTemplateFindUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE", templateId), {
      params: Promise.resolve({ id: templateId }),
    });
    expect(res.status).toBe(404);
  });
});
