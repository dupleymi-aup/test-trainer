import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserCount: vi.fn(),
    mockGroupCount: vi.fn(),
    mockAttemptCount: vi.fn(),
    mockAttemptAggregate: vi.fn(),
    mockUserGroupBy: vi.fn(),
    mockUserFindMany: vi.fn(),
    mockAttemptGroupBy: vi.fn(),
    mockGroupFindMany: vi.fn(),
    mockUserGroupFindMany: vi.fn(),
    mockGetCache: vi.fn(),
    mockSetCache: vi.fn(),
    mockBatchComputeStudentRisk: vi.fn(),
    adminGuardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      count: mocks.mockUserCount,
      groupBy: mocks.mockUserGroupBy,
      findMany: mocks.mockUserFindMany,
    },
    group: {
      count: mocks.mockGroupCount,
      findMany: mocks.mockGroupFindMany,
    },
    attempt: {
      count: mocks.mockAttemptCount,
      aggregate: mocks.mockAttemptAggregate,
      groupBy: mocks.mockAttemptGroupBy,
    },
    userGroup: {
      findMany: mocks.mockUserGroupFindMany,
    },
  },
}));

vi.mock("@/lib/analytics-cache", () => ({
  getCache: mocks.mockGetCache,
  setCache: mocks.mockSetCache,
  makeCacheKey: vi.fn((key: string) => `cache:${key}`),
  DEFAULT_TTL: { medium: 300, short: 60, long: 3600 },
}));

vi.mock("@/lib/risk-analysis", () => ({
  batchComputeStudentRisk: mocks.mockBatchComputeStudentRisk,
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
  return new Request("http://localhost:3000/api/admin/executive");
}

const student = {
  id: "s1",
  name: "Alice",
  email: "alice@test.com",
  group: "MGU-101",
  university: "MGU",
  createdAt: new Date("2024-01-15"),
  attempts: [
    {
      score: 80,
      ecCoverage: 0.5,
      bvCoverage: 0.5,
      createdAt: new Date("2024-06-01"),
    },
  ],
};

function setupDashboardMocks() {
  mocks.mockUserCount.mockResolvedValueOnce(5); // totalStudents
  mocks.mockUserCount.mockResolvedValueOnce(2); // totalTeachers
  mocks.mockGroupCount.mockResolvedValueOnce(3); // totalGroups
  mocks.mockAttemptCount.mockResolvedValueOnce(100); // totalAttempts
  mocks.mockUserCount.mockResolvedValueOnce(4); // activeStudents30d
  mocks.mockAttemptAggregate.mockResolvedValue({ _avg: { score: 80.4 } });
  mocks.mockUserGroupBy.mockResolvedValue([
    { role: "STUDENT", _count: 5 },
    { role: "TEACHER", _count: 2 },
    { role: "ADMIN", _count: 1 },
  ]);
  mocks.mockUserFindMany.mockResolvedValue([student]);
  mocks.mockBatchComputeStudentRisk.mockReturnValue(
    new Map([
      [
        "s1",
        {
          risk: {
            riskFactors: ["low-activity"],
            trend: "stable",
            dropoutRisk: "low",
          },
          stats: { avgScore: 80, bestScore: 80, trendScore: 0 },
        },
      ],
    ])
  );
  mocks.mockAttemptGroupBy.mockResolvedValue([]);
  mocks.mockAttemptGroupBy.mockResolvedValueOnce([
    {
      createdAt: new Date("2024-06-01T10:00:00Z"),
      _count: { _all: 3 },
      _avg: { score: 80 },
    },
    {
      createdAt: new Date("2024-06-02T10:00:00Z"),
      _count: { _all: 2 },
      _avg: { score: 90 },
    },
  ]);
  mocks.mockAttemptGroupBy.mockResolvedValueOnce([
    { userId: "s1", _sum: { score: 160 }, _count: { _all: 2 } },
    { userId: "s2", _sum: { score: 100 }, _count: { _all: 2 } },
  ]);
  mocks.mockGroupFindMany.mockResolvedValue([
    { id: "g1", name: "Group 1" },
    { id: "g2", name: "Group 2" },
  ]);
  mocks.mockUserGroupFindMany.mockResolvedValue([
    { userId: "s1", groupId: "g1" },
    { userId: "s2", groupId: "g1" },
  ]);
}

describe("GET /api/admin/executive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
    mocks.mockGetCache.mockReturnValue(null);
    mocks.mockSetCache.mockImplementation(() => undefined);
  });

  it("returns cached result without hitting the database", async () => {
    mocks.mockGetCache.mockReturnValue({ kpi: { totalStudents: 1 } });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kpi.totalStudents).toBe(1);
    expect(mocks.mockUserCount).not.toHaveBeenCalled();
    expect(mocks.mockSetCache).not.toHaveBeenCalled();
  });

  it("computes KPIs and dashboard data", async () => {
    setupDashboardMocks();

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.kpi).toEqual({
      totalStudents: 5,
      totalTeachers: 2,
      totalGroups: 3,
      totalAttempts: 100,
      avgScore: 80,
      activeStudents30d: 4,
      activeRate: 80,
    });
    expect(body.roleDistribution).toEqual([
      { role: "STUDENT", count: 5 },
      { role: "TEACHER", count: 2 },
      { role: "ADMIN", count: 1 },
    ]);
    expect(body.riskBreakdown.total).toBe(1);
    expect(body.activityTrend.length).toBe(2);
    expect(body.activityTrend[0].attempts).toBe(3);
    expect(body.topGroups[0].name).toBe("Group 1");
    expect(body.topGroups[0].avgScore).toBe(65);
    expect(mocks.mockSetCache).toHaveBeenCalledWith(
      "cache:executive",
      expect.any(Object),
      300
    );
  });

  it("handles zero students without division by zero", async () => {
    mocks.mockUserCount.mockResolvedValueOnce(0); // totalStudents
    mocks.mockUserCount.mockResolvedValueOnce(0); // totalTeachers
    mocks.mockGroupCount.mockResolvedValueOnce(0);
    mocks.mockAttemptCount.mockResolvedValueOnce(0);
    mocks.mockUserCount.mockResolvedValueOnce(0); // activeStudents30d
    mocks.mockAttemptAggregate.mockResolvedValue({ _avg: { score: null } });
    mocks.mockUserGroupBy.mockResolvedValue([]);
    mocks.mockUserFindMany.mockResolvedValue([]);
    mocks.mockBatchComputeStudentRisk.mockReturnValue(new Map());
    mocks.mockAttemptGroupBy.mockResolvedValue([]);
    mocks.mockGroupFindMany.mockResolvedValue([]);
    mocks.mockUserGroupFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kpi.activeRate).toBe(0);
    expect(body.kpi.avgScore).toBe(0);
    expect(body.riskBreakdown.total).toBe(0);
    expect(body.topGroups).toEqual([]);
  });

  it("returns 403 when unauthorized", async () => {
    mocks.adminGuardResult = {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });
});
