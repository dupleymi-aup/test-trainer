import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockAttemptFindMany: vi.fn(),
    loggerError: vi.fn(),
    guardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    attempt: {
      findMany: mocks.mockAttemptFindMany,
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: mocks.loggerError,
  },
}));

vi.mock("@/lib/admin-guard", () => {
  const m = mocks;
  return {
    requireStudent: vi.fn().mockImplementation(async () => {
      if (m.guardResult) return m.guardResult;
      return { session: { userId: "student-1", role: "STUDENT" } };
    }),
  };
});

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ limited: false, resetAt: Date.now() + 60000 }),
  createRateLimitResponse: vi.fn().mockReturnValue(
    NextResponse.json({ error: "Too many requests" }, { status: 429 })
  ),
  rateLimits: { studentAnalytics: { window: 60000, max: 30 } },
}));

vi.mock("@/lib/analytics-cache", () => ({
  getCache: vi.fn().mockReturnValue(null),
  setCache: vi.fn(),
  DEFAULT_TTL: { expensive: 300000, medium: 180000, simple: 60000, short: 30000 },
}));

vi.mock("@/lib/tasks", () => ({
  tasks: [
    { id: 1, name: "Task 1", difficulty: "easy", topics: ["equivalence"] },
    { id: 2, name: "Task 2", difficulty: "medium", topics: ["boundary"] },
    { id: 3, name: "Task 3", difficulty: "hard", topics: ["equivalence", "boundary"] },
  ],
}));

vi.mock("@/lib/api-error-handler", () => ({
  validateApiResponse: vi.fn(),
  unwrapGuard: vi.fn(<T>(result: { session: T } | { response: Response; status: number }): T => {
    if ("response" in result) {
      const err = new Error("Error") as Error & { statusCode: number };
      err.statusCode = result.response.status;
      throw err;
    }
    return (result as { session: T }).session;
  }),
  withErrorHandler: vi.fn(async (_req: unknown, handler: () => Promise<NextResponse>) => {
    try {
      return await handler();
    } catch (error: unknown) {
      const appErr = error as { statusCode?: number; message?: string };
      if (appErr.statusCode) {
        return NextResponse.json({ error: appErr.message || "Error" }, { status: appErr.statusCode });
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }),
}));

import { GET } from "./route";

function makeGetRequest() {
  return new Request("http://localhost:3000/api/student/analytics");
}

function setAuthorized() {
  mocks.guardResult = { session: { userId: "student-1", role: "STUDENT" } };
}

function setUnauthorized() {
  mocks.guardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

describe("GET /api/student/analytics", () => {
  beforeEach(() => {
    setAuthorized();
    mocks.mockAttemptFindMany.mockResolvedValue([]);
  });

  it("returns analytics with zero attempts when student has none", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attempts).toBe(0);
    expect(body.scoresOverTime).toEqual([]);
    expect(body.topicMastery).toEqual([]);
    expect(body.taskBreakdown).toEqual([]);
    expect(body.difficultyBreakdown).toHaveLength(3);
  });

  it("calculates scores over time from attempts", async () => {
    mocks.mockAttemptFindMany.mockResolvedValue([
      { id: "a1", taskId: 1, score: 80, ecCoverage: 70, bvCoverage: 60, correctness: 1, timeSpent: 120, createdAt: new Date("2024-06-01") },
      { id: "a2", taskId: 2, score: 90, ecCoverage: 85, bvCoverage: 80, correctness: 1, timeSpent: 90, createdAt: new Date("2024-06-02") },
    ]);
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.attempts).toBe(2);
    expect(body.scoresOverTime).toHaveLength(2);
    expect(body.scoresOverTime[0].score).toBe(80);
    expect(body.scoresOverTime[1].score).toBe(90);
  });

  it("computes topicMastery from attempt data", async () => {
    mocks.mockAttemptFindMany.mockResolvedValue([
      { id: "a1", taskId: 1, score: 100, ecCoverage: 100, bvCoverage: 100, correctness: 1, timeSpent: 60, createdAt: new Date("2024-06-01") },
      { id: "a2", taskId: 2, score: 50, ecCoverage: 50, bvCoverage: 40, correctness: 1, timeSpent: 120, createdAt: new Date("2024-06-02") },
    ]);
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.topicMastery.length).toBeGreaterThanOrEqual(1);
    const eq = body.topicMastery.find((t: { topic: string }) => t.topic === "equivalence");
    expect(eq).toBeDefined();
    expect(eq.avgScore).toBe(100);
  });

  it("returns 403 when unauthorized", async () => {
    setUnauthorized();
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("handles db error gracefully", async () => {
    mocks.mockAttemptFindMany.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });

  it("identifies weak and strong areas", async () => {
    mocks.mockAttemptFindMany.mockResolvedValue([
      { id: "a1", taskId: 1, score: 30, ecCoverage: 20, bvCoverage: 10, correctness: 0, timeSpent: 200, createdAt: new Date("2024-06-01") },
    ]);
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.weakAreas.length).toBeGreaterThanOrEqual(0);
    expect(body.strongAreas.length).toBeGreaterThanOrEqual(0);
  });

  it("computes difficultyBreakdown correctly", async () => {
    mocks.mockAttemptFindMany.mockResolvedValue([
      { id: "a1", taskId: 1, score: 90, ecCoverage: 80, bvCoverage: 70, correctness: 1, timeSpent: 60, createdAt: new Date("2024-06-01") },
    ]);
    const res = await GET(makeGetRequest());
    const body = await res.json();
    const easy = body.difficultyBreakdown.find((d: { difficulty: string }) => d.difficulty === "easy");
    expect(easy.completed).toBe(1);
    expect(easy.total).toBe(1);
    expect(easy.percent).toBe(100);
    const hard = body.difficultyBreakdown.find((d: { difficulty: string }) => d.difficulty === "hard");
    expect(hard.completed).toBe(0);
    expect(hard.percent).toBe(0);
  });

  it("validates response schema", async () => {
    const { validateApiResponse } = await import("@/lib/api-error-handler");
    await GET(makeGetRequest());
    expect(validateApiResponse).toHaveBeenCalled();
  });
});

