import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    requireAuth: vi.fn(),
    requireCSRF: vi.fn(),
    attemptCreate: vi.fn(),
    attemptFindMany: vi.fn(),
    userGroupFindMany: vi.fn(),
    groupTaskFindMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    attempt: {
      create: mocks.attemptCreate,
      findMany: mocks.attemptFindMany,
    },
    userGroup: {
      findMany: mocks.userGroupFindMany,
    },
    groupTask: {
      findMany: mocks.groupTaskFindMany,
    },
  },
}));

vi.mock("@/lib/admin-guard", () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/csrf-middleware", () => ({
  requireCSRF: mocks.requireCSRF,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ limited: false, resetAt: Date.now() + 60000 }),
  createRateLimitResponse: vi.fn().mockReturnValue(
    NextResponse.json({ error: "Too many requests" }, { status: 429 })
  ),
  rateLimits: { attemptSubmission: { window: 60000, max: 30 } },
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { POST, GET } from "./route";

const validAttempt = {
  taskId: "1",
  testCases: [{ id: "tc1", inputs: ["a", "b"], expectedOutput: "true", category: "EC" }],
  score: 80,
  ecCoverage: 75,
  bvCoverage: 60,
  correctness: 70,
  coveredEcIds: ["ec1"],
  coveredBvDescriptions: ["bv1"],
  timeSpent: 120,
};

const mockSession = { userId: "student-1", role: "STUDENT" };

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost:3000/api/attempts", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/attempts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ session: mockSession });
    mocks.requireCSRF.mockResolvedValue({ ok: true });
    mocks.userGroupFindMany.mockResolvedValue([]);
    mocks.groupTaskFindMany.mockResolvedValue([]);
    mocks.attemptCreate.mockResolvedValue({ id: "attempt-1" });
  });

  it("creates attempt successfully", async () => {
    const res = await POST(makeRequest("POST", validAttempt));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.attemptId).toBe("attempt-1");
  });

  it("returns 401 when not authenticated", async () => {
    mocks.requireAuth.mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeRequest("POST", validAttempt));
    expect(res.status).toBe(401);
  });

  it("returns 403 when CSRF fails", async () => {
    mocks.requireCSRF.mockResolvedValue({
      response: NextResponse.json({ error: "CSRF token missing" }, { status: 403 }),
    });
    const res = await POST(makeRequest("POST", validAttempt));
    expect(res.status).toBe(403);
  });

  it("returns 403 when task not in group whitelist", async () => {
    mocks.userGroupFindMany.mockResolvedValue([{ groupId: "g1" }]);
    mocks.groupTaskFindMany.mockResolvedValue([{ taskId: "2" }]);
    const res = await POST(makeRequest("POST", validAttempt));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("not available");
  });

  it("allows attempt when task is in group whitelist", async () => {
    mocks.userGroupFindMany.mockResolvedValue([{ groupId: "g1" }]);
    mocks.groupTaskFindMany.mockResolvedValue([{ taskId: "1" }]);
    const res = await POST(makeRequest("POST", validAttempt));
    expect(res.status).toBe(201);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost:3000/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await POST(makeRequest("POST", {}));
    expect(res.status).toBe(400);
  });

  it("returns 429 on rate limit", async () => {
    const rateLimit = await import("@/lib/rate-limit");
    vi.mocked(rateLimit.checkRateLimit).mockReturnValueOnce({
      limited: true,
      resetAt: Date.now() + 60000,
    });
    const res = await POST(makeRequest("POST", validAttempt));
    expect(res.status).toBe(429);
  });

  it("handles db error gracefully", async () => {
    mocks.attemptCreate.mockRejectedValue(new Error("DB down"));
    const res = await POST(makeRequest("POST", validAttempt));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/attempts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ session: mockSession });
    mocks.attemptFindMany.mockResolvedValue([
      { id: "a1", taskId: "1", score: 80, ecCoverage: 75, bvCoverage: 60, correctness: 70, timeSpent: 120, createdAt: new Date("2024-01-01") },
    ]);
  });

  it("lists attempts for authenticated user", async () => {
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attempts).toHaveLength(1);
    expect(body.attempts[0].id).toBe("a1");
  });

  it("returns 401 when not authenticated", async () => {
    mocks.requireAuth.mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("filters by taskId when query param provided", async () => {
    const req = new Request("http://localhost:3000/api/attempts?taskId=1", { method: "GET" });
    await GET(req);
    expect(mocks.attemptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ taskId: "1" }),
      })
    );
  });

  it("respects limit parameter", async () => {
    const req = new Request("http://localhost:3000/api/attempts?limit=10", { method: "GET" });
    await GET(req);
    expect(mocks.attemptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  it("clamps limit to max 200", async () => {
    const req = new Request("http://localhost:3000/api/attempts?limit=999", { method: "GET" });
    await GET(req);
    expect(mocks.attemptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 })
    );
  });

  it("handles db error gracefully", async () => {
    mocks.attemptFindMany.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(500);
  });
});
