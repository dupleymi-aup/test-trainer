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
    parseBodyResult: { success: true, data: { taskId: 1 } } as
      | { success: true; data: { taskId: number } }
      | { success: false; errorResponse: NextResponse },
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    activityLogCreate: vi.fn(),
    loggerError: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    favoriteTask: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
      create: mocks.create,
      deleteMany: mocks.deleteMany,
    },
    activityLog: {
      create: mocks.activityLogCreate,
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
  checkRateLimit: vi.fn().mockReturnValue({ limited: false, remaining: 20, resetAt: Date.now() + 60000 }),
  createRateLimitResponse: vi.fn().mockReturnValue(
    NextResponse.json({ error: "Too many requests" }, { status: 429 })
  ),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  rateLimits: { studentFavoriteToggle: { window: 60000, max: 20 } },
}));

vi.mock("@/lib/analytics-cache", () => ({
  getCache: vi.fn().mockReturnValue(null),
  setCache: vi.fn(),
  DEFAULT_TTL: { expensive: 300000, medium: 180000, simple: 60000, short: 30000 },
}));

vi.mock("@/lib/api-error-handler", () => ({
  parseRequestBody: vi.fn().mockImplementation(async () => mocks.parseBodyResult),
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
  unwrapGuard: vi.fn(<T>(result: { session: T } | { response: Response; status: number }): T => {
    if ("response" in result) {
      const err = new Error("Error") as Error & { statusCode: number };
      err.statusCode = result.response.status;
      throw err;
    }
    return (result as { session: T }).session;
  }),
}));

import { GET, POST, DELETE } from "./route";

function makeGetRequest() {
  return new Request("http://localhost:3000/api/student/favorites");
}

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

function setInvalidBody() {
  mocks.parseBodyResult = {
    success: false,
    errorResponse: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
  };
}

function setValidBody() {
  mocks.parseBodyResult = { success: true, data: { taskId: 1 } };
}

function makeRequest(method: string, body?: unknown): Request {
  const url = "http://localhost/api/student/favorites";
  const init: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: { "content-type": "application/json", "x-csrf-token": "valid" },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(url, init);
}

function makeDeleteRequest(taskId: string): Request {
  return new Request(`http://localhost/api/student/favorites?taskId=${taskId}`, {
    method: "DELETE",
    headers: { "x-csrf-token": "valid" },
  });
}

describe("GET /api/student/favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthorized();
    setCSRFPass();
  });

  it("returns 403 when not authenticated", async () => {
    setUnauthorized();
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("returns empty favorites list", async () => {
    mocks.findMany.mockResolvedValue([]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.favorites).toEqual([]);
  });

  it("returns list of favorites", async () => {
    const favorites = [
      { id: "fav-1", taskId: 1, createdAt: new Date("2026-01-01").toISOString() },
      { id: "fav-2", taskId: 5, createdAt: new Date("2026-01-02").toISOString() },
    ];
    mocks.findMany.mockResolvedValue(favorites);
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.favorites).toHaveLength(2);
    expect(body.favorites[0].taskId).toBe(1);
  });

  it("queries by current user id", async () => {
    mocks.findMany.mockResolvedValue([]);
    await GET(makeGetRequest());
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { userId: "student-1" },
      orderBy: { createdAt: "desc" },
      select: { id: true, taskId: true, createdAt: true },
    });
  });

  it("handles db error gracefully", async () => {
    mocks.findMany.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

describe("POST /api/student/favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthorized();
    setCSRFPass();
    setValidBody();
  });

  it("returns 403 when not authenticated", async () => {
    setUnauthorized();
    const res = await POST(makeRequest("POST", { taskId: 1 }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when CSRF fails", async () => {
    setCSRFFail();
    const res = await POST(makeRequest("POST", { taskId: 1 }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid body", async () => {
    setInvalidBody();
    const res = await POST(makeRequest("POST", { taskId: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 on rate limit", async () => {
    vi.mocked(await import("@/lib/rate-limit")).checkRateLimit.mockReturnValueOnce({
      limited: true,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });
    const res = await POST(makeRequest("POST", { taskId: 1 }));
    expect(res.status).toBe(429);
  });

  it("returns existing favorite if already favorited", async () => {
    const existing = { id: "fav-1", userId: "student-1", taskId: 1, createdAt: new Date().toISOString() };
    mocks.findUnique.mockResolvedValue(existing);
    const res = await POST(makeRequest("POST", { taskId: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.favorite).toEqual(existing);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates a new favorite", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const newFav = { id: "fav-new", userId: "student-1", taskId: 1, createdAt: new Date().toISOString() };
    mocks.create.mockResolvedValue(newFav);
    const res = await POST(makeRequest("POST", { taskId: 1 }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.favorite).toEqual(newFav);
  });

  it("handles db error gracefully", async () => {
    mocks.findUnique.mockRejectedValue(new Error("DB down"));
    const res = await POST(makeRequest("POST", { taskId: 1 }));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/student/favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthorized();
    setCSRFPass();
  });

  it("returns 403 when not authenticated", async () => {
    setUnauthorized();
    const res = await DELETE(makeDeleteRequest("1"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when CSRF fails", async () => {
    setCSRFFail();
    const res = await DELETE(makeDeleteRequest("1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when taskId missing", async () => {
    const req = new Request("http://localhost/api/student/favorites", {
      method: "DELETE",
      headers: { "x-csrf-token": "valid" },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid taskId", async () => {
    const res = await DELETE(makeDeleteRequest("not-a-number"));
    expect(res.status).toBe(400);
  });

  it("deletes favorite and logs activity", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    const res = await DELETE(makeDeleteRequest("5"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { userId: "student-1", taskId: 5 },
    });

    expect(mocks.activityLogCreate).toHaveBeenCalledWith({
      data: {
        userId: "student-1",
        action: "FAVORITE_REMOVE",
        entity: "FavoriteTask",
        details: JSON.stringify({ taskId: 5 }),
        ipAddress: "127.0.0.1",
      },
    });
  });

  it("handles db error gracefully", async () => {
    mocks.deleteMany.mockRejectedValue(new Error("DB down"));
    const res = await DELETE(makeDeleteRequest("1"));
    expect(res.status).toBe(500);
  });
});

