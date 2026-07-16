import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    guardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    parseParamsResult: { success: true as const, data: { period: "all" as const, limit: 20, page: 1 } },
    findManyAttempt: vi.fn(),
    findManyUserGroup: vi.fn(),
    loggerError: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    attempt: { findMany: mocks.findManyAttempt },
    userGroup: { findMany: mocks.findManyUserGroup },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: mocks.loggerError,
  },
}));

vi.mock("@/lib/admin-guard", () => ({
  requireStudent: vi.fn().mockImplementation(async () => {
    if (mocks.guardResult) return mocks.guardResult;
    return { session: { userId: "student-1", role: "STUDENT" } };
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ limited: false, remaining: 20, resetAt: Date.now() + 60000 }),
  createRateLimitResponse: vi.fn().mockReturnValue(
    NextResponse.json({ error: "Too many requests" }, { status: 429 })
  ),
  rateLimits: { studentLeaderboard: { window: 60000, max: 20 } },
}));

vi.mock("@/lib/api-error-handler", () => ({
  parseSearchParams: vi.fn().mockImplementation(() => mocks.parseParamsResult),
  validateApiResponse: vi.fn().mockImplementation((_schema: unknown, data: unknown) => data),
  withErrorHandler: vi.fn(async (_req: unknown, handler: () => Promise<NextResponse>) => {
    try { return await handler(); }
    catch (error: unknown) {
      const appErr = error as { statusCode?: number; message?: string };
      if (appErr.statusCode) {
        return NextResponse.json({ error: appErr.message || "Error" }, { status: appErr.statusCode });
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }),
  unwrapGuard: vi.fn(<T>(result: { session: T } | { response: Response; status: number }): T => {
    if ("response" in result) {
      const err = new Error("Error") as Error & { statusCode: number };
      err.statusCode = result.response.status;
      throw err;
    }
    return (result as { session: T }).session;
  }),
}));

import { GET } from "./route";

function makeAttempt(overrides: Partial<{
  userId: string; taskId: string; score: number; timeSpent: number; userName: string; avatar: string | null;
}> = {}) {
  return {
    userId: overrides.userId ?? "student-1",
    taskId: overrides.taskId ?? "1",
    score: overrides.score ?? 80,
    ecCoverage: 50, bvCoverage: 50, correctness: 80,
    timeSpent: overrides.timeSpent ?? 600,
    user: { id: overrides.userId ?? "student-1", name: overrides.userName ?? "Student", avatar: overrides.avatar ?? null },
  };
}

function setAuthorized() { mocks.guardResult = { session: { userId: "student-1", role: "STUDENT" } }; }
function setUnauthorized() { mocks.guardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }; }
function setParams(data: Record<string, unknown>) { mocks.parseParamsResult = { success: true, data } as typeof mocks.parseParamsResult; }

function makeRequest(query?: Record<string, string>): Request {
  const params = new URLSearchParams(query ?? {});
  return new Request(`http://localhost/api/student/leaderboard?${params.toString()}`, { method: "GET" });
}

describe("GET /api/student/leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthorized();
    setParams({ period: "all", limit: 20, page: 1 });
  });

  it("returns 403 when not authenticated", async () => {
    setUnauthorized();
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns 429 on rate limit", async () => {
    const rateLimit = await import("@/lib/rate-limit");
    vi.mocked(rateLimit.checkRateLimit).mockReturnValueOnce({
      limited: true, remaining: 0, resetAt: Date.now() + 60000,
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(429);
  });

  it("returns empty leaderboard when no attempts", async () => {
    mocks.findManyAttempt.mockResolvedValue([]);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.leaderboard).toEqual([]);
    expect(body.totalParticipants).toBe(0);
    expect(body.currentUser).toBeNull();
  });

  it("returns sorted leaderboard by avgScore descending", async () => {
    mocks.findManyAttempt.mockResolvedValue([
      makeAttempt({ userId: "u1", userName: "Alice", score: 90, taskId: "1" }),
      makeAttempt({ userId: "u2", userName: "Bob", score: 70, taskId: "1" }),
      makeAttempt({ userId: "u1", userName: "Alice", score: 80, taskId: "2" }),
    ]);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.leaderboard).toHaveLength(2);
    expect(body.leaderboard[0].name).toBe("Alice");
    expect(body.leaderboard[1].name).toBe("Bob");
    expect(body.leaderboard[0].avgScore).toBe(85);
  });

  it("returns currentUser rank", async () => {
    mocks.findManyAttempt.mockResolvedValue([
      makeAttempt({ userId: "student-1", userName: "Me", score: 80 }),
      makeAttempt({ userId: "other", userName: "Other", score: 90 }),
    ]);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.currentUser).not.toBeNull();
    expect(body.currentUser.rank).toBe(2);
  });

  it("returns null currentUser when user has no attempts", async () => {
    mocks.findManyAttempt.mockResolvedValue([
      makeAttempt({ userId: "other", userName: "Other", score: 90 }),
    ]);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.currentUser).toBeNull();
  });

  it("filters by period=week with dateFrom", async () => {
    setParams({ period: "week", limit: 20, page: 1 });
    mocks.findManyAttempt.mockResolvedValue([]);
    await GET(makeRequest({ period: "week" }));
    expect(mocks.findManyAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ createdAt: { gte: expect.any(Date) } }) })
    );
  });

  it("does not include createdAt filter for period=all", async () => {
    mocks.findManyAttempt.mockResolvedValue([]);
    await GET(makeRequest({ period: "all" }));
    const call = mocks.findManyAttempt.mock.calls[0]?.[0];
    expect(call.where.createdAt).toBeUndefined();
  });

  it("filters by groupId", async () => {
    setParams({ period: "all", limit: 20, page: 1, groupId: "g-1" });
    mocks.findManyUserGroup.mockResolvedValue([{ userId: "student-1" }, { userId: "other" }]);
    mocks.findManyAttempt.mockResolvedValue([]);
    await GET(makeRequest({ groupId: "g-1" }));
    expect(mocks.findManyAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: { in: ["student-1", "other"] } }) })
    );
  });

  it("returns empty when group has no members", async () => {
    setParams({ period: "all", limit: 20, page: 1, groupId: "g-empty" });
    mocks.findManyUserGroup.mockResolvedValue([]);
    const res = await GET(makeRequest({ groupId: "g-empty" }));
    const body = await res.json();
    expect(body.leaderboard).toEqual([]);
    expect(body.totalParticipants).toBe(0);
  });

  it("paginates results", async () => {
    setParams({ period: "all", limit: 1, page: 2 });
    const attempts = [];
    for (let i = 0; i < 3; i++) attempts.push(makeAttempt({ userId: `u${i}`, userName: `User${i}`, score: 100 - i * 10 }));
    mocks.findManyAttempt.mockResolvedValue(attempts);
    const res = await GET(makeRequest({ limit: "1", page: "2" }));
    const body = await res.json();
    expect(body.leaderboard).toHaveLength(1);
    expect(body.page).toBe(2);
    expect(body.totalPages).toBe(3);
    expect(body.leaderboard[0].name).toBe("User1");
  });

  it("ignores attempts with negative score", async () => {
    mocks.findManyAttempt.mockResolvedValue([
      makeAttempt({ userId: "u1", userName: "Good", score: 80 }),
      makeAttempt({ userId: "u1", userName: "Good", score: -1, taskId: "2" }),
    ]);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.leaderboard[0].totalAttempts).toBe(1);
  });

  it("handles db error gracefully", async () => {
    mocks.findManyAttempt.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
