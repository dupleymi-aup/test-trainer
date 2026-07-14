import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    guardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    csrfResult: null as
      | { verified: true }
      | { response: NextResponse }
      | null,
    parseBodyResult: { success: true, data: {} } as
      | { success: true; data: Record<string, unknown> }
      | { success: false; errorResponse: NextResponse },
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    loggerError: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    studentExam: {
      findMany: mocks.findMany,
      count: mocks.count,
      create: mocks.create,
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

vi.mock("@/lib/admin-guard", () => ({
  requireStudent: vi.fn().mockImplementation(async () => {
    if (mocks.guardResult) return mocks.guardResult;
    return { session: { userId: "student-1", role: "STUDENT" } };
  }),
}));

vi.mock("@/lib/csrf-middleware", () => ({
  requireCSRF: vi.fn().mockImplementation(async () => {
    if (mocks.csrfResult) return mocks.csrfResult;
    return { verified: true };
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ limited: false, remaining: 30, resetAt: Date.now() + 60000 }),
  createRateLimitResponse: vi.fn().mockReturnValue(
    NextResponse.json({ error: "Too many requests" }, { status: 429 })
  ),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  rateLimits: { studentExamSubmit: { window: 60000, max: 30 } },
}));

vi.mock("@/lib/api-error-handler", () => ({
  parseRequestBody: vi.fn().mockImplementation(async () => mocks.parseBodyResult),
  withErrorHandler: vi.fn(async (_req: unknown, handler: () => Promise<NextResponse>) => {
    try {
      return await handler();
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }),
}));

import { GET, POST } from "./route";

const validExamBody = {
  taskIds: [1, 2, 3],
  timeLimit: 30,
  mode: "exam" as const,
  avgScore: 75,
  bestTaskId: 2,
  bestTaskScore: 100,
  worstTaskId: 1,
  worstTaskScore: 50,
  totalCorrectness: 80,
  timeSpent: 1200,
  results: { "1": 80, "2": 100, "3": 60 },
};

function setAuthorized() {
  mocks.guardResult = { session: { userId: "student-1", role: "STUDENT" } };
}

function setUnauthorized() {
  mocks.guardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

function setCSRFPass() {
  mocks.csrfResult = { verified: true };
}

function setCSRFFail() {
  mocks.csrfResult = {
    response: NextResponse.json({ error: "CSRF failed" }, { status: 403 }),
  };
}

function setValidBody(data?: Record<string, unknown>) {
  mocks.parseBodyResult = { success: true, data: data ?? validExamBody };
}

function setInvalidBody() {
  mocks.parseBodyResult = {
    success: false,
    errorResponse: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
  };
}

function makeRequest(method: string, body?: unknown): Request {
  const init: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: { "content-type": "application/json", "x-csrf-token": "valid" },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request("http://localhost/api/student/exams", init);
}

function makeGetRequest(page?: number): Request {
  const url = page ? `http://localhost/api/student/exams?page=${page}` : "http://localhost/api/student/exams";
  return new Request(url, { method: "GET" });
}

describe("GET /api/student/exams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthorized();
  });

  it("returns 403 when not authenticated", async () => {
    setUnauthorized();
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("returns empty exam list", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exams).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
  });

  it("returns paginated exams", async () => {
    const exams = Array.from({ length: 20 }, (_, i) => ({
      id: `exam-${i + 1}`,
      taskIds: JSON.stringify([i + 1]),
      timeLimit: 30,
      mode: "exam",
      avgScore: 50 + i,
      bestTaskScore: 100,
      worstTaskScore: 0,
      timeSpent: 600,
      createdAt: new Date(`2026-01-${String(i + 1).padStart(2, "0")}`).toISOString(),
    }));
    mocks.findMany.mockResolvedValue(exams);
    mocks.count.mockResolvedValue(50);
    const res = await GET(makeGetRequest(1));
    const body = await res.json();
    expect(body.exams).toHaveLength(20);
    expect(body.total).toBe(50);
    expect(body.page).toBe(1);
  });

  it("queries by current user id with correct pagination", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    await GET(makeGetRequest(2));
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { userId: "student-1" },
      orderBy: { createdAt: "desc" },
      take: 20,
      skip: 20,
      select: expect.objectContaining({ id: true }),
    });
  });

  it("handles invalid page number", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    await GET(makeGetRequest(-1));
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 })
    );
  });

  it("handles db error gracefully", async () => {
    mocks.findMany.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

describe("POST /api/student/exams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthorized();
    setCSRFPass();
    setValidBody();
  });

  it("returns 403 when not authenticated", async () => {
    setUnauthorized();
    const res = await POST(makeRequest("POST", validExamBody));
    expect(res.status).toBe(403);
  });

  it("returns 403 when CSRF fails", async () => {
    setCSRFFail();
    const res = await POST(makeRequest("POST", validExamBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid body", async () => {
    setInvalidBody();
    const res = await POST(makeRequest("POST", { invalid: true }));
    expect(res.status).toBe(400);
  });

  it("returns 429 on rate limit", async () => {
    const rateLimit = await import("@/lib/rate-limit");
    vi.mocked(rateLimit.checkRateLimit).mockReturnValueOnce({
      limited: true, remaining: 0, resetAt: Date.now() + 60000,
    });
    const res = await POST(makeRequest("POST", validExamBody));
    expect(res.status).toBe(429);
  });

  it("creates exam and returns 201", async () => {
    const createdExam = { id: "exam-new", userId: "student-1", ...validExamBody, createdAt: new Date().toISOString() };
    mocks.create.mockResolvedValue(createdExam);
    const res = await POST(makeRequest("POST", validExamBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.exam).toEqual(createdExam);
  });

  it("passes correct data to db create", async () => {
    mocks.create.mockResolvedValue({ id: "exam-new" });
    await POST(makeRequest("POST", validExamBody));
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        userId: "student-1",
        taskIds: JSON.stringify(validExamBody.taskIds),
        timeLimit: validExamBody.timeLimit,
        mode: validExamBody.mode,
        avgScore: validExamBody.avgScore,
        bestTaskId: validExamBody.bestTaskId,
        bestTaskScore: validExamBody.bestTaskScore,
        worstTaskId: validExamBody.worstTaskId,
        worstTaskScore: validExamBody.worstTaskScore,
        totalCorrectness: validExamBody.totalCorrectness,
        timeSpent: validExamBody.timeSpent,
        results: JSON.stringify(validExamBody.results),
      },
    });
  });

  it("handles db error gracefully", async () => {
    mocks.create.mockRejectedValue(new Error("DB down"));
    const res = await POST(makeRequest("POST", validExamBody));
    expect(res.status).toBe(500);
  });
});
