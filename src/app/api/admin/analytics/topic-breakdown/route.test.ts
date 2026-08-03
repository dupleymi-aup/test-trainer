import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse, NextRequest } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockGroupFindUnique: vi.fn(),
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
    group: { findUnique: mocks.mockGroupFindUnique },
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
  return new NextRequest(`http://localhost:3000/api/admin/analytics/topic-breakdown${query}`);
}

const attemptForTask1 = {
  taskId: "1",
  score: 80,
  ecCoverage: 60,
  bvCoverage: 50,
  timeSpent: 120,
  createdAt: new Date("2026-08-03T10:00:00Z"),
  coveredEcIds: JSON.stringify(["ec1", "ec2"]),
};

describe("GET /api/admin/analytics/topic-breakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
    mocks.mockGetCache.mockReturnValue(null);
    mocks.mockSetCache.mockImplementation(() => undefined);
    mocks.mockAttemptFindMany.mockResolvedValue([]);
  });

  it("computes topic breakdown from attempts", async () => {
    mocks.mockAttemptFindMany.mockResolvedValueOnce([attemptForTask1]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.topics).toHaveLength(2);
    const topic = body.topics.find((t: { topic: string }) => t.topic === "Классы эквивалентности");
    expect(topic).toMatchObject({
      avgScore: 80,
      avgEcCoverage: 60,
      avgBvCoverage: 50,
      avgTimeSpent: 120,
      attemptsCount: 1,
    });
    expect(body.topics[0].trend).toBe("stable");
    expect(body.timePerTopic["Классы эквивалентности"]).toEqual([
      { date: "2026-08-03", totalTime: 2, avgScore: 80 },
    ]);
    const ec1 = body.subtopics["Классы эквивалентности"].find((s: { id: string }) => s.id === "ec1");
    expect(ec1.missRate).toBe(0);
    expect(ec1.attempts).toBe(1);
    const ec3 = body.subtopics["Классы эквивалентности"].find((s: { id: string }) => s.id === "ec3");
    expect(ec3.missRate).toBe(100);
    expect(mocks.mockSetCache).toHaveBeenCalledWith("cache:topic-breakdown", expect.any(Object), 300);
  });

  it("filters attempts by group members", async () => {
    mocks.mockGroupFindUnique.mockResolvedValue({
      members: [{ userId: "u1" }, { userId: "u2" }],
    });

    const res = await GET(makeRequest("?groupId=g1"));
    expect(res.status).toBe(200);
    expect(mocks.mockGroupFindUnique).toHaveBeenCalledWith({
      where: { id: "g1" },
      select: { members: { select: { userId: true } } },
    });
    expect(mocks.mockAttemptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { in: ["u1", "u2"] } }),
      })
    );
    expect(mocks.mockUserFindMany).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.topics).toEqual([]);
  });

  it("filters attempts by university", async () => {
    mocks.mockUserFindMany.mockResolvedValue([{ id: "u1" }]);

    const res = await GET(makeRequest("?university=MGU"));
    expect(res.status).toBe(200);
    expect(mocks.mockGroupFindUnique).not.toHaveBeenCalled();
    expect(mocks.mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ university: "MGU", role: "STUDENT" }),
      })
    );
    expect(mocks.mockAttemptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { in: ["u1"] } }),
      })
    );
  });

  it("returns cached result without hitting the database", async () => {
    mocks.mockGetCache.mockReturnValue({ topics: [], subtopics: {}, timePerTopic: {} });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.topics).toEqual([]);
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
