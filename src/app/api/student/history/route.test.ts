import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockAttemptFindMany: vi.fn(),
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
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
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
  rateLimits: { studentHistory: { window: 60000, max: 30 } },
}));

vi.mock("@/lib/analytics-cache", () => ({
  getCache: vi.fn().mockReturnValue(null),
  setCache: vi.fn(),
  DEFAULT_TTL: { expensive: 300000, medium: 180000, simple: 60000, short: 30000 },
}));

vi.mock("@/lib/tasks", () => ({
  tasks: [
    { id: 1, name: "Task One", difficulty: "easy", topics: ["equivalence"] },
    { id: 2, name: "Task Two", difficulty: "medium", topics: ["boundary"] },
  ],
}));

import { GET } from "./route";

function makeGetRequest() {
  return new Request("http://localhost:3000/api/student/history");
}

function setAuthorized() {
  mocks.guardResult = { session: { userId: "student-1", role: "STUDENT" } };
}

function setUnauthorized() {
  mocks.guardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

const mockAttempts = [
  { id: "a1", taskId: 1, score: 80, ecCoverage: 70, bvCoverage: 60, correctness: 1, timeSpent: 120, createdAt: new Date("2024-06-01") },
  { id: "a2", taskId: 1, score: 90, ecCoverage: 85, bvCoverage: 80, correctness: 1, timeSpent: 90, createdAt: new Date("2024-06-02") },
  { id: "a3", taskId: 2, score: 50, ecCoverage: 40, bvCoverage: 30, correctness: 0, timeSpent: 200, createdAt: new Date("2024-06-03") },
];

describe("GET /api/student/history", () => {
  beforeEach(() => {
    setAuthorized();
    mocks.mockAttemptFindMany.mockResolvedValue(mockAttempts);
  });

  it("returns grouped task history without taskId param", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.taskHistory).toHaveLength(2);
    const t1 = body.taskHistory.find((t: { taskId: string }) => t.taskId === "1");
    expect(t1.taskName).toBe("Task One");
    expect(t1.attemptsCount).toBe(2);
    expect(t1.bestScore).toBe(90);
    expect(t1.avgScore).toBe(85);
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

  it("returns empty history when student has no attempts", async () => {
    mocks.mockAttemptFindMany.mockResolvedValue([]);
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.taskHistory).toEqual([]);
  });
});

