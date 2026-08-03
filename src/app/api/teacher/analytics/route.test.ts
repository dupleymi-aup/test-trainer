import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserGroupFindMany: vi.fn(),
    mockAttemptFindMany: vi.fn(),
    mockParseSearchParams: vi.fn(),
    guardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    groupGuardResult: null as
      | { group: { id: string } }
      | { response: NextResponse }
      | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    userGroup: { findMany: mocks.mockUserGroupFindMany },
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
    requireTeacherGroup: vi.fn().mockImplementation(async () => {
      if (m.groupGuardResult) return m.groupGuardResult;
      return { group: { id: "g1" } };
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
  unwrapGroupGuard: vi.fn(<T>(result: { group: T } | { response: NextResponse }): T => {
    if ("response" in result) {
      const err = new Error("Forbidden") as Error & { statusCode: number };
      err.statusCode = result.response.status;
      throw err;
    }
    return (result as { group: T }).group;
  }),
  parseSearchParams: mocks.mockParseSearchParams,
}));

import { GET } from "./route";

function makeRequest() {
  return new Request("http://localhost:3000/api/teacher/analytics?groupId=g1");
}

const mockAttempt = {
  score: 85,
  ecCoverage: 0.6,
  bvCoverage: 0.4,
  taskId: "task-1",
  createdAt: new Date("2024-06-01"),
};

describe("GET /api/teacher/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.guardResult = { session: { userId: "teacher-1", role: "TEACHER" } };
    mocks.groupGuardResult = { group: { id: "g1" } };
    mocks.mockParseSearchParams.mockReturnValue({
      success: true,
      data: { groupId: "g1" },
    });
    mocks.mockUserGroupFindMany.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
    mocks.mockAttemptFindMany.mockResolvedValue([
      mockAttempt,
      { ...mockAttempt, score: 30 },
      { ...mockAttempt, score: 55 },
    ]);
  });

  it("computes distribution, task difficulty and overall stats", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.distribution).toEqual({
      "0-20": 0,
      "21-40": 1,
      "41-60": 1,
      "61-80": 0,
      "81-100": 1,
    });
    expect(body.taskDifficulty).toEqual([
      { taskId: "task-1", avgScore: 57, attemptsCount: 3 },
    ]);
    expect(body.overallAvg).toBe(57);
    expect(body.totalAttempts).toBe(3);
    expect(mocks.mockAttemptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: { in: ["u1", "u2"] } },
        take: 500,
      })
    );
  });

  it("returns zeroed analytics for empty group", async () => {
    mocks.mockUserGroupFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.distribution["0-20"]).toBe(0);
    expect(body.taskDifficulty).toEqual([]);
    expect(body.overallAvg).toBe(0);
    expect(body.totalAttempts).toBe(0);
    expect(mocks.mockAttemptFindMany).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid params", async () => {
    mocks.mockParseSearchParams.mockReturnValue({
      success: false,
      errorResponse: NextResponse.json({ error: "Invalid params" }, { status: 400 }),
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns 403 when teacher does not own the group", async () => {
    mocks.groupGuardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns 403 when unauthorized", async () => {
    mocks.guardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });
});
