import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockAttemptFindUnique: vi.fn(),
    mockUserGroupFindFirst: vi.fn(),
    mockGetTeacherGroupIds: vi.fn(),
    guardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    attempt: { findUnique: mocks.mockAttemptFindUnique },
    userGroup: { findFirst: mocks.mockUserGroupFindFirst },
  },
}));

vi.mock("@/lib/admin-guard", () => {
  const m = mocks;
  return {
    requireAuth: vi.fn().mockImplementation(async () => {
      if (m.guardResult) return m.guardResult;
      return { session: { userId: "student-1", role: "STUDENT" } };
    }),
    getTeacherGroupIds: m.mockGetTeacherGroupIds,
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

function makeRequest() {
  return new Request("http://localhost:3000/api/attempts/attempt-1");
}

function setSession(userId: string, role: string) {
  mocks.guardResult = { session: { userId, role } };
}

const mockAttempt = {
  id: "attempt-1",
  userId: "student-1",
  taskId: "task-1",
  score: 80,
  createdAt: new Date(),
  user: { id: "student-1" },
};

describe("GET /api/attempts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("student-1", "STUDENT");
    mocks.mockAttemptFindUnique.mockResolvedValue(mockAttempt);
    mocks.mockGetTeacherGroupIds.mockResolvedValue(["g1"]);
  });

  it("allows student to view own attempt", async () => {
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "attempt-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attempt.score).toBe(80);
  });

  it("returns 404 when attempt not found", async () => {
    mocks.mockAttemptFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when student views another student's attempt", async () => {
    mocks.mockAttemptFindUnique.mockResolvedValue({
      ...mockAttempt,
      userId: "student-2",
      user: { id: "student-2" },
    });

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "attempt-1" }) });
    expect(res.status).toBe(403);
  });

  it("allows admin to view any attempt", async () => {
    setSession("admin-1", "ADMIN");
    mocks.mockAttemptFindUnique.mockResolvedValue({
      ...mockAttempt,
      userId: "student-2",
      user: { id: "student-2" },
    });

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "attempt-1" }) });
    expect(res.status).toBe(200);
  });

  it("allows teacher to view attempt of student in own group", async () => {
    setSession("teacher-1", "TEACHER");
    mocks.mockAttemptFindUnique.mockResolvedValue({
      ...mockAttempt,
      userId: "student-2",
      user: { id: "student-2" },
    });
    mocks.mockUserGroupFindFirst.mockResolvedValue({ userId: "student-2", groupId: "g1" });

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "attempt-1" }) });
    expect(res.status).toBe(200);
    expect(mocks.mockUserGroupFindFirst).toHaveBeenCalledWith({
      where: { userId: "student-2", groupId: { in: ["g1"] } },
    });
  });

  it("returns 403 when teacher views attempt of student outside own groups", async () => {
    setSession("teacher-1", "TEACHER");
    mocks.mockAttemptFindUnique.mockResolvedValue({
      ...mockAttempt,
      userId: "student-2",
      user: { id: "student-2" },
    });
    mocks.mockUserGroupFindFirst.mockResolvedValue(null);

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "attempt-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 403 when unauthorized", async () => {
    mocks.guardResult = { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "attempt-1" }) });
    expect(res.status).toBe(401);
  });
});
