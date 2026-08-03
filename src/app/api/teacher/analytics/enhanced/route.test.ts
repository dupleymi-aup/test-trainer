import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserGroupFindMany: vi.fn(),
    mockAttemptFindMany: vi.fn(),
    mockGroupFindMany: vi.fn(),
    mockParseSearchParams: vi.fn(),
    mockLoggerWarn: vi.fn(),
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
    group: { findMany: mocks.mockGroupFindMany },
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

vi.mock("@/lib/logger", () => ({
  logger: { warn: mocks.mockLoggerWarn },
}));

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
  return new Request("http://localhost:3000/api/teacher/analytics/enhanced?groupId=g1");
}

const mockAttempt = {
  userId: "u1",
  taskId: "1",
  score: 85,
  ecCoverage: 0.6,
  bvCoverage: 0.4,
  correctness: 0.8,
  timeSpent: 1200,
  createdAt: new Date("2024-06-10T12:00:00Z"),
  testCases: '[{"category":"Нормальное значение","status":"passed"}]',
};

const groupWithAttempts = {
  id: "g1",
  name: "Group 1",
  members: [
    {
      user: {
        id: "u1",
        attempts: [
          { score: 85, ecCoverage: 0.6, bvCoverage: 0.4 },
          { score: 75, ecCoverage: 0.5, bvCoverage: 0.5 },
        ],
      },
    },
  ],
};

describe("GET /api/teacher/analytics/enhanced", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.guardResult = { session: { userId: "teacher-1", role: "TEACHER" } };
    mocks.groupGuardResult = { group: { id: "g1" } };
    mocks.mockParseSearchParams.mockReturnValue({
      success: true,
      data: { groupId: "g1" },
    });
    mocks.mockUserGroupFindMany.mockResolvedValue([{ userId: "u1" }]);
    mocks.mockAttemptFindMany.mockResolvedValue([mockAttempt]);
    mocks.mockGroupFindMany.mockResolvedValue([groupWithAttempts]);
  });

  it("computes full analytics payload", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.scoreDistribution).toEqual([
      { range: "0-20", count: 0 },
      { range: "21-40", count: 0 },
      { range: "41-60", count: 0 },
      { range: "61-80", count: 0 },
      { range: "81-100", count: 1 },
    ]);
    expect(body.taskDifficulty).toHaveLength(1);
    expect(body.taskDifficulty[0].avgScore).toBe(85);
    expect(body.topicPerformance.length).toBeGreaterThan(0);
    expect(body.timeTrends).toHaveLength(1);
    expect(body.timeTrends[0].date).toBe("2024-06");
    expect(body.categoryDistribution).toEqual([
      { category: "Нормальное значение", count: 1, percentage: 100 },
    ]);
    expect(body.overallStats).toEqual({
      totalAttempts: 1,
      avgScore: 85,
      avgEc: 1,
      avgBv: 0,
      avgCorrectness: 1,
      avgTimeSpent: 1200,
    });
    expect(body.groupComparison).toEqual([
      {
        groupId: "g1",
        groupName: "Group 1",
        studentCount: 1,
        avgScore: 80,
        avgEc: 1,
        avgBv: 0,
        totalAttempts: 2,
      },
    ]);
  });

  it("logs warning and skips invalid testCases JSON", async () => {
    mocks.mockAttemptFindMany.mockResolvedValue([{ ...mockAttempt, testCases: "{broken" }]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categoryDistribution).toEqual([]);
    expect(mocks.mockLoggerWarn).toHaveBeenCalled();
  });

  it("returns empty payloads when no attempts", async () => {
    mocks.mockUserGroupFindMany.mockResolvedValue([{ userId: "u1" }]);
    mocks.mockAttemptFindMany.mockResolvedValue([]);
    mocks.mockGroupFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scoreDistribution).toHaveLength(5);
    expect(body.taskDifficulty).toEqual([]);
    expect(body.overallStats.totalAttempts).toBe(0);
    expect(body.groupComparison).toEqual([]);
  });

  it("returns 403 when teacher does not own the group", async () => {
    mocks.groupGuardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
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
});
