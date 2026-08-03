import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserGroupFindMany: vi.fn(),
    mockUserGroupFindFirst: vi.fn(),
    mockGroupFindMany: vi.fn(),
    mockGradeFindMany: vi.fn(),
    mockGradeUpsert: vi.fn(),
    mockGradeDelete: vi.fn(),
    mockUserFindMany: vi.fn(),
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
    userGroup: {
      findMany: mocks.mockUserGroupFindMany,
      findFirst: mocks.mockUserGroupFindFirst,
    },
    group: { findMany: mocks.mockGroupFindMany },
    grade: {
      findMany: mocks.mockGradeFindMany,
      upsert: mocks.mockGradeUpsert,
      delete: mocks.mockGradeDelete,
    },
    user: { findMany: mocks.mockUserFindMany },
    activityLog: {
      create: mocks.mockActivityLogCreate,
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.mockCheckRateLimit,
  createRateLimitResponse: mocks.mockCreateRateLimitResponse,
  getClientIp: mocks.mockGetClientIp,
  rateLimits: { teacherGradebook: { max: 60, windowMs: 60000 } },
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
  return new Request(`http://localhost:3000/api/teacher/gradebook${query}`, init);
}

function setSession(role: string, userId: string) {
  mocks.guardResult = { session: { userId, role } };
}

const mockGrade = {
  id: "grade-1",
  userId: "u1",
  taskId: "task-1",
  score: 85,
  comment: null,
  gradedAt: new Date(),
  user: { id: "u1", name: "Alice", email: "a@t.com", group: "G1" },
  gradedBy: { id: "teacher-1", name: "Teacher" },
};

describe("GET /api/teacher/gradebook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.mockUserGroupFindMany.mockResolvedValue([{ userId: "u1" }]);
    mocks.mockGradeFindMany.mockResolvedValue([mockGrade]);
    mocks.mockUserFindMany.mockResolvedValue([
      { id: "u1", name: "Alice", email: "a@t.com", group: "G1" },
    ]);
  });

  it("returns grades for a group", async () => {
    const res = await GET(makeRequest("GET", "?groupId=g1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.grades).toHaveLength(1);
    expect(body.students).toHaveLength(1);
    expect(mocks.mockUserGroupFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groupId: "g1" } })
    );
  });

  it("returns grades for all teacher groups without groupId", async () => {
    mocks.mockGroupFindMany.mockResolvedValue([{ id: "g1" }, { id: "g2" }]);

    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    expect(mocks.mockGroupFindMany).toHaveBeenCalledWith({
      where: { createdByUserId: "teacher-1" },
      select: { id: true },
    });
    expect(mocks.mockUserGroupFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groupId: { in: ["g1", "g2"] } } })
    );
  });

  it("returns empty lists when teacher has no students", async () => {
    mocks.mockGroupFindMany.mockResolvedValue([]);
    mocks.mockUserGroupFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ grades: [], students: [] });
    expect(mocks.mockGradeFindMany).not.toHaveBeenCalled();
  });

  it("returns 403 when unauthorized", async () => {
    mocks.guardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/teacher/gradebook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockUserGroupFindFirst.mockResolvedValue({ userId: "u1", groupId: "g1" });
    mocks.mockGradeUpsert.mockResolvedValue({ ...mockGrade, score: 90 });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("upserts a grade for a student in own group", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { userId: "u1", taskId: "task-1", score: 90, comment: "Good" },
    });

    const res = await POST(makeRequest("POST", "", { userId: "u1", taskId: "task-1", score: 90 }));
    expect(res.status).toBe(200);
    expect(mocks.mockGradeUpsert).toHaveBeenCalledWith({
      where: { userId_taskId: { userId: "u1", taskId: "task-1" } },
      create: { userId: "u1", taskId: "task-1", score: 90, comment: "Good", gradedById: "teacher-1" },
      update: { score: 90, comment: "Good", gradedById: "teacher-1" },
      include: expect.objectContaining({ user: { select: { id: true, name: true, email: true } } }),
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "GRADE_SET" }),
      })
    );
  });

  it("returns 403 when student not in teacher's group", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { userId: "other", taskId: "task-1", score: 50 },
    });
    mocks.mockUserGroupFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest("POST", "", { userId: "other", taskId: "task-1", score: 50 }));
    expect(res.status).toBe(403);
    expect(mocks.mockGradeUpsert).not.toHaveBeenCalled();
  });

  it("allows admin to grade any student", async () => {
    setSession("ADMIN", "admin-1");
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { userId: "u1", taskId: "task-1", score: 75 },
    });
    mocks.mockUserGroupFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest("POST", "", { userId: "u1", taskId: "task-1", score: 75 }));
    expect(res.status).toBe(200);
    expect(mocks.mockGradeUpsert).toHaveBeenCalled();
  });

  it("returns 403 when unauthorized", async () => {
    mocks.guardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    const res = await POST(makeRequest("POST", "", { userId: "u1", taskId: "task-1", score: 75 }));
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/teacher/gradebook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockUserGroupFindFirst.mockResolvedValue({ userId: "u1", groupId: "g1" });
    mocks.mockGradeDelete.mockResolvedValue({ id: "grade-1" });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("deletes a grade", async () => {
    const res = await DELETE(makeRequest("DELETE", "?userId=u1&taskId=task-1"));
    expect(res.status).toBe(200);
    expect(mocks.mockGradeDelete).toHaveBeenCalledWith({
      where: { userId_taskId: { userId: "u1", taskId: "task-1" } },
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "GRADE_DELETE" }),
      })
    );
  });

  it("returns 400 when userId or taskId missing", async () => {
    const res = await DELETE(makeRequest("DELETE", "?userId=u1"));
    expect(res.status).toBe(400);
    expect(mocks.mockGradeDelete).not.toHaveBeenCalled();
  });

  it("returns 404 when grade not found (P2025)", async () => {
    const { Prisma } = await import("@prisma/client");
    mocks.mockGradeDelete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "5.22.0",
      })
    );

    const res = await DELETE(makeRequest("DELETE", "?userId=u1&taskId=task-1"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when student not in teacher's group", async () => {
    mocks.mockUserGroupFindFirst.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE", "?userId=u1&taskId=task-1"));
    expect(res.status).toBe(403);
  });
});
