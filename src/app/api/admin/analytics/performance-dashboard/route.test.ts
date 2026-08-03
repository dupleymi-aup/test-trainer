import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse, NextRequest } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserFindMany: vi.fn(),
    mockGetCache: vi.fn(),
    mockSetCache: vi.fn(),
    mockBatchComputeStudentRisk: vi.fn(),
    mockParseSearchParams: vi.fn(),
    adminGuardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findMany: mocks.mockUserFindMany },
  },
}));

vi.mock("@/lib/analytics-cache", () => ({
  getCache: mocks.mockGetCache,
  setCache: mocks.mockSetCache,
  makeCacheKey: vi.fn((key: string) => `cache:${key}`),
  DEFAULT_TTL: { expensive: 300000, medium: 300, simple: 60, short: 30 },
}));

vi.mock("@/lib/risk-analysis", () => ({
  batchComputeStudentRisk: mocks.mockBatchComputeStudentRisk,
}));

vi.mock("@/lib/time-constants", () => ({
  MS_PER_DAY: 86400000,
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
  parseSearchParams: mocks.mockParseSearchParams,
}));

import { GET } from "./route";

function makeRequest(query = "") {
  return new NextRequest(`http://localhost:3000/api/admin/analytics/performance-dashboard${query}`);
}

const defaultParams = {
  page: 1,
  limit: 50,
  search: "",
  groupId: undefined,
  university: undefined,
  sortBy: "avgScore",
  sortOrder: "desc",
};

const studentA = {
  id: "s1",
  name: "Alice",
  email: "alice@test.com",
  group: "MGU-101",
  university: "MGU",
  createdAt: new Date(Date.now() - 30 * 86400000),
  attempts: [
    { score: 70, ecCoverage: 50, bvCoverage: 50, correctness: 100, timeSpent: 60, createdAt: new Date() },
    { score: 90, ecCoverage: 80, bvCoverage: 70, correctness: 100, timeSpent: 90, createdAt: new Date() },
  ],
};

const studentB = {
  id: "s2",
  name: "Bob",
  email: "bob@test.com",
  group: "MGU-102",
  university: "MGU",
  createdAt: new Date(Date.now() - 60 * 86400000),
  attempts: [],
};

function setupRiskMap() {
  mocks.mockBatchComputeStudentRisk.mockReturnValue(
    new Map([
      [
        "s1",
        {
          stats: { bestScore: 90, avgScore: 80, avgEc: 65, avgBv: 60, totalAttempts: 2 },
          risk: { riskFactors: ["declining"], trend: "declining", dropoutRisk: "high" },
        },
      ],
      [
        "s2",
        {
          stats: { bestScore: 0, avgScore: 0, avgEc: 0, avgBv: 0, totalAttempts: 0 },
          risk: { riskFactors: [], trend: "stable", dropoutRisk: "low" },
        },
      ],
    ])
  );
}

describe("GET /api/admin/analytics/performance-dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
    mocks.mockGetCache.mockReturnValue(null);
    mocks.mockSetCache.mockImplementation(() => undefined);
    mocks.mockParseSearchParams.mockReturnValue({ success: true, data: defaultParams });
  });

  it("returns cached result without hitting the database", async () => {
    mocks.mockGetCache.mockReturnValue({
      students: [{ studentId: "s1", metrics: { avgScore: 80 } }],
      summary: {},
      pagination: {},
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.students[0].studentId).toBe("s1");
    expect(mocks.mockUserFindMany).not.toHaveBeenCalled();
    expect(mocks.mockSetCache).not.toHaveBeenCalled();
  });

  it("computes student rows, summary and pagination", async () => {
    mocks.mockUserFindMany.mockResolvedValueOnce([studentA, studentB]);
    setupRiskMap();

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.students).toHaveLength(2);
    expect(body.students[0].studentId).toBe("s1");
    expect(body.students[0].metrics).toMatchObject({
      avgScore: 80,
      bestScore: 90,
      totalAttempts: 2,
      attemptsLast7Days: 2,
      trend: "declining",
      riskLevel: "high",
      riskScore: 2,
    });
    expect(body.students[1].studentId).toBe("s2");
    expect(body.students[1].metrics).toMatchObject({
      avgScore: 0,
      totalAttempts: 0,
      attemptsLast7Days: 0,
      lastAttemptDate: null,
      riskLevel: "low",
    });
    expect(body.summary).toEqual({
      totalStudents: 2,
      avgScore: 40,
      highRisk: 1,
      mediumRisk: 0,
      lowRisk: 1,
      activeLast7Days: 1,
      inactive: 1,
    });
    expect(body.pagination).toEqual({ page: 1, limit: 50, total: 2, totalPages: 1 });
    expect(mocks.mockUserFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.mockSetCache).toHaveBeenCalledWith("cache:performance-dashboard", expect.any(Object), 300);
  });

  it("returns 400 on invalid query params", async () => {
    mocks.mockParseSearchParams.mockReturnValue({
      success: false,
      errorResponse: NextResponse.json({ error: "Invalid params" }, { status: 400 }),
    });

    const res = await GET(makeRequest("?limit=0"));
    expect(res.status).toBe(400);
    expect(mocks.mockUserFindMany).not.toHaveBeenCalled();
  });

  it("returns 403 when unauthorized", async () => {
    mocks.adminGuardResult = {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });
});
