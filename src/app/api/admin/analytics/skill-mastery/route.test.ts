import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserGroupFindMany: vi.fn(),
    mockUserFindMany: vi.fn(),
    mockAttemptFindMany: vi.fn(),
    mockGetCache: vi.fn(),
    mockSetCache: vi.fn(),
    adminGuardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    userGroup: { findMany: mocks.mockUserGroupFindMany },
    user: { findMany: mocks.mockUserFindMany },
    attempt: { findMany: mocks.mockAttemptFindMany },
  },
}));

vi.mock("@/lib/analytics-cache", () => ({
  getCache: mocks.mockGetCache,
  setCache: mocks.mockSetCache,
  makeCacheKey: vi.fn((key: string) => `cache:${key}`),
  DEFAULT_TTL: { expensive: 300000, medium: 300, simple: 60, short: 30 },
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

function makeRequest(query = "") {
  return new Request(`http://localhost:3000/api/admin/analytics/skill-mastery${query}`);
}

function makeAttempts(scores: number[]) {
  return scores.map((score, i) => ({
    taskId: "1",
    score,
    ecCoverage: 50,
    bvCoverage: 50,
    coveredEcIds: JSON.stringify(["ec1", "ec2"]),
    coveredBvDescriptions: JSON.stringify(["Нижняя граница (факториал = 1)"]),
    createdAt: new Date(Date.now() - (scores.length - 1 - i) * 86400000),
  }));
}

describe("GET /api/admin/analytics/skill-mastery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
    mocks.mockGetCache.mockReturnValue(null);
    mocks.mockSetCache.mockImplementation(() => undefined);
    mocks.mockUserGroupFindMany.mockResolvedValue([]);
    mocks.mockUserFindMany.mockResolvedValue([]);
    mocks.mockAttemptFindMany.mockResolvedValue([]);
  });

  it("computes EC and BV skill mastery", async () => {
    mocks.mockUserFindMany.mockResolvedValueOnce([{ id: "s1" }]);
    mocks.mockAttemptFindMany.mockResolvedValueOnce(makeAttempts([20, 30, 40, 80, 85, 90]));

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ecSkills).toHaveLength(5);
    expect(body.ecSkills[0].ecId).toBe("ec3");
    expect(body.ecSkills[0].coverageRate).toBe(0);
    expect(body.ecSkills[0].attemptsCount).toBe(6);
    expect(body.ecSkills[0].avgScore).toBe(58);
    expect(body.ecSkills[0].trend).toBe("improving");
    expect(body.ecSkills[3].ecId).toBe("ec1");
    expect(body.ecSkills[3].coverageRate).toBe(100);
    expect(body.bvSkills).toHaveLength(6);
    expect(body.bvSkills[0].coverageRate).toBe(0);
    expect(body.bvSkills[5].bvDescription).toBe("Нижняя граница (факториал = 1)");
    expect(body.bvSkills[5].coverageRate).toBe(100);
    expect(body.summary.totalEcSkills).toBe(5);
    expect(body.summary.masteredEc).toBe(2);
    expect(body.summary.weakEc).toBe(3);
    expect(body.summary.totalBvSkills).toBe(6);
    expect(body.summary.masteredBv).toBe(1);
    expect(body.summary.weakBv).toBe(5);
    expect(body.summary.improvingEc).toHaveLength(5);
    expect(body.summary.decliningEc).toHaveLength(0);
    expect(mocks.mockSetCache).toHaveBeenCalledWith("cache:skill-mastery", expect.any(Object), 300000);
  });

  it("filters students by group members", async () => {
    mocks.mockUserGroupFindMany.mockResolvedValueOnce([{ userId: "s1" }]);
    mocks.mockUserFindMany.mockResolvedValueOnce([{ id: "s1" }]);

    const res = await GET(makeRequest("?groupId=g1"));
    expect(res.status).toBe(200);
    expect(mocks.mockUserGroupFindMany).toHaveBeenCalledWith({
      where: { groupId: "g1" },
      select: { userId: true },
    });
    expect(mocks.mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ["s1"] } }),
      })
    );
    expect(mocks.mockAttemptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { in: ["s1"] } }),
      })
    );
  });

  it("filters by university", async () => {
    mocks.mockUserFindMany.mockResolvedValueOnce([{ id: "s1" }]);

    const res = await GET(makeRequest("?university=MGU"));
    expect(res.status).toBe(200);
    expect(mocks.mockUserGroupFindMany).not.toHaveBeenCalled();
    expect(mocks.mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ university: "MGU", role: "STUDENT" }),
      })
    );
  });

  it("returns cached result without hitting the database", async () => {
    mocks.mockGetCache.mockReturnValue({ ecSkills: [], bvSkills: [], summary: {} });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ecSkills).toEqual([]);
    expect(mocks.mockUserFindMany).not.toHaveBeenCalled();
    expect(mocks.mockAttemptFindMany).not.toHaveBeenCalled();
    expect(mocks.mockSetCache).not.toHaveBeenCalled();
  });

  it("returns 403 when unauthorized", async () => {
    mocks.adminGuardResult = {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });
});
