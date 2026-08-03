import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserGroupFindFirst: vi.fn(),
    mockUserFindUnique: vi.fn(),
    mockAttemptFindMany: vi.fn(),
    guardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    userGroup: { findFirst: mocks.mockUserGroupFindFirst },
    user: { findUnique: mocks.mockUserFindUnique },
    attempt: { findMany: mocks.mockAttemptFindMany },
  },
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

import { GET } from "./route";

const studentId = "student-1";

function makeRequest() {
  return new Request(`http://localhost:3000/api/teacher/students/${studentId}/progress`);
}

const mockStudent = {
  id: studentId,
  name: "Alice",
  email: "alice@test.com",
  phone: "+7-999-111-22-33",
  university: "MGU",
  group: "MGU-101",
  createdAt: new Date("2024-01-15"),
};

const mockAttempt = {
  id: "a1",
  userId: studentId,
  taskId: "1",
  score: 80,
  ecCoverage: 0.5,
  bvCoverage: 0.5,
  createdAt: new Date("2024-06-01T10:00:00Z"),
  testCases: '[{"name":"tc1"}]',
  coveredEcIds: "[\"EC-1\"]",
  coveredBvDescriptions: "[\"BV-1\"]",
};

describe("GET /api/teacher/students/[id]/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.guardResult = { session: { userId: "teacher-1", role: "TEACHER" } };
    mocks.mockUserGroupFindFirst.mockResolvedValue({ userId: studentId, groupId: "g1" });
    mocks.mockUserFindUnique.mockResolvedValue(mockStudent);
    mocks.mockAttemptFindMany.mockResolvedValue([mockAttempt]);
  });

  it("returns progress data for a student in own group", async () => {
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: studentId }) });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.student.email).toBe("alice@test.com");
    expect(body.stats).toEqual({
      bestScore: 80,
      avgScore: 80,
      avgEc: 1,
      avgBv: 1,
      totalAttempts: 1,
    });
    expect(body.attempts).toHaveLength(1);
    expect(body.attempts[0].testCases).toEqual([{ name: "tc1" }]);
    expect(body.attempts[0].coveredEcIds).toEqual(["EC-1"]);
    expect(body.scoresOverTime).toHaveLength(1);
    expect(body.taskBreakdown).toHaveLength(1);
  });

  it("parses empty JSON strings into empty arrays", async () => {
    mocks.mockAttemptFindMany.mockResolvedValue([
      { ...mockAttempt, testCases: "", coveredEcIds: "", coveredBvDescriptions: null },
    ]);

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: studentId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attempts[0].testCases).toEqual([]);
    expect(body.attempts[0].coveredEcIds).toEqual([]);
    expect(body.attempts[0].coveredBvDescriptions).toEqual([]);
  });

  it("returns zero stats for student without attempts", async () => {
    mocks.mockAttemptFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: studentId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stats).toEqual({
      bestScore: 0,
      avgScore: 0,
      avgEc: 0,
      avgBv: 0,
      totalAttempts: 0,
    });
    expect(body.weakAreas).toEqual([]);
    expect(body.strongAreas).toEqual([]);
  });

  it("returns 403 when student not in teacher's group", async () => {
    mocks.mockUserGroupFindFirst.mockResolvedValue(null);

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: studentId }) });
    expect(res.status).toBe(403);
    expect(mocks.mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("allows admin to view any student", async () => {
    mocks.guardResult = { session: { userId: "admin-1", role: "ADMIN" } };
    mocks.mockUserGroupFindFirst.mockResolvedValue(null);

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: studentId }) });
    expect(res.status).toBe(200);
  });

  it("returns 404 when student not found", async () => {
    mocks.mockUserFindUnique.mockResolvedValue(null);

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: studentId }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when unauthorized", async () => {
    mocks.guardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: studentId }) });
    expect(res.status).toBe(403);
  });
});
