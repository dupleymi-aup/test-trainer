import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserFindMany: vi.fn(),
    mockGroupFindMany: vi.fn(),
    mockQueryRaw: vi.fn(),
    mockDeadlineFindMany: vi.fn(),
    mockBatchComputeStudentRisk: vi.fn(),
    adminGuardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findMany: mocks.mockUserFindMany },
    group: { findMany: mocks.mockGroupFindMany },
    deadline: { findMany: mocks.mockDeadlineFindMany },
    $queryRaw: mocks.mockQueryRaw,
  },
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
  return new Request("http://localhost:3000/api/admin/alerts");
}

const oldStudent = {
  id: "s-old",
  name: "Inactive Student",
  email: "inactive@test.com",
  group: "G1",
  createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  attempts: [],
};

const highRiskStudent = {
  id: "s-risk",
  name: "Risk Student",
  email: "risk@test.com",
  group: "G1",
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  attempts: [
    {
      score: 20,
      ecCoverage: 0.1,
      bvCoverage: 0.1,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  ],
};

const lowGroup = {
  id: "g1",
  name: "Weak Group",
  members: [
    {
      user: {
        id: "u1",
        name: "User 1",
        attempts: [
          { score: 30, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
          { score: 20, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        ],
      },
    },
  ],
};

const teacherNoGroups = {
  id: "t1",
  name: "Lonely Teacher",
  email: "teacher@test.com",
  createdGroups: [],
};

describe("GET /api/admin/alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
    mocks.mockBatchComputeStudentRisk.mockReturnValue(
      new Map([
        [
          "s-risk",
          {
            risk: {
              riskFactors: ["low-activity"],
              trend: "stable",
              dropoutRisk: "high",
            },
            stats: { avgScore: 20, bestScore: 20, trendScore: 0 },
          },
        ],
      ])
    );
  });

  it("generates alerts for all categories", async () => {
    mocks.mockUserFindMany.mockResolvedValueOnce([oldStudent, highRiskStudent]);
    mocks.mockGroupFindMany.mockResolvedValueOnce([lowGroup]);
    mocks.mockQueryRaw.mockResolvedValueOnce([
      { taskId: "task-1", total: "10", fails: "8" },
    ]);
    mocks.mockDeadlineFindMany.mockResolvedValueOnce([
      {
        id: "d1",
        title: "Exam",
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        type: "EXAM",
        group: { id: "g1", name: "Group 1" },
      },
    ]);
    mocks.mockDeadlineFindMany.mockResolvedValueOnce([
      {
        id: "d2",
        title: "Test",
        dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
        type: "TEST",
        group: null,
      },
    ]);
    mocks.mockUserFindMany.mockResolvedValueOnce([teacherNoGroups]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    const categories = body.alerts.map((a: { category: string }) => a.category);
    expect(categories).toContain("STUDENT_ENGAGEMENT");
    expect(categories).toContain("STUDENT_RISK");
    expect(categories).toContain("GROUP_PERFORMANCE");
    expect(categories).toContain("TASK_DIFFICULTY");
    expect(categories).toContain("DEADLINE_OVERDUE");
    expect(categories).toContain("DEADLINE_APPROACHING");
    expect(categories).toContain("TEACHER_INACTIVE");

    expect(body.summary.critical).toBeGreaterThan(0);
    expect(body.summary.total).toBe(body.alerts.length);
    expect(body.summary.actionable).toBeGreaterThan(0);

    const severities = body.alerts.map((a: { severity: string }) => a.severity);
    expect(severities).toEqual([...severities].sort((a: string, b: string) => {
      const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
      return order[a] - order[b];
    }));
  });

  it("returns empty alerts for empty data", async () => {
    mocks.mockUserFindMany.mockResolvedValueOnce([]);
    mocks.mockGroupFindMany.mockResolvedValueOnce([]);
    mocks.mockQueryRaw.mockResolvedValueOnce([]);
    mocks.mockDeadlineFindMany.mockResolvedValueOnce([]);
    mocks.mockDeadlineFindMany.mockResolvedValueOnce([]);
    mocks.mockUserFindMany.mockResolvedValueOnce([]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerts).toEqual([]);
    expect(body.summary).toEqual({
      critical: 0,
      warning: 0,
      info: 0,
      total: 0,
      actionable: 0,
      categories: [],
    });
  });

  it("returns 403 when unauthorized", async () => {
    mocks.adminGuardResult = {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });
});
