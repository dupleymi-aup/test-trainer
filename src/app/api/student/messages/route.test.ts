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
    updateMany: vi.fn(),
    loggerError: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    message: {
      findMany: mocks.findMany,
      count: mocks.count,
      updateMany: mocks.updateMany,
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
  rateLimits: { studentMarkRead: { window: 60000, max: 60 } },
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

import { GET, PATCH } from "./route";

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
  mocks.parseBodyResult = { success: true, data: data ?? { messageIds: ["msg-1"] } };
}

function setInvalidBody() {
  mocks.parseBodyResult = {
    success: false,
    errorResponse: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
  };
}

function makeGetRequest(page?: number, limit?: number): Request {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return new Request(`http://localhost/api/student/messages${qs ? "?" + qs : ""}`, { method: "GET" });
}

function makePatchRequest(body?: unknown): Request {
  const init: RequestInit & { headers: Record<string, string> } = {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-csrf-token": "valid" },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request("http://localhost/api/student/messages", init);
}

describe("GET /api/student/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthorized();
  });

  it("returns 403 when not authenticated", async () => {
    setUnauthorized();
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("returns empty messages list with zero counts", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.unreadCount).toBe(0);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(30);
  });

  it("returns paginated messages with unread count", async () => {
    const messages = [
      { id: "msg-1", text: "Hello", read: false, fromUser: { id: "teacher-1", name: "Teacher", role: "TEACHER" } },
      { id: "msg-2", text: "Reminder", read: true, fromUser: { id: "teacher-1", name: "Teacher", role: "TEACHER" } },
    ];
    mocks.findMany.mockResolvedValue(messages);
    mocks.count.mockResolvedValueOnce(2); // total
    mocks.count.mockResolvedValueOnce(1); // unread
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.messages).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.unreadCount).toBe(1);
  });

  it("queries by current user id", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    await GET(makeGetRequest(1));
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { toUserId: "student-1" } })
    );
  });

  it("clamps limit to 50", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    await GET(makeGetRequest(1, 999));
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    );
  });

  it("sets Cache-Control header", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    const res = await GET(makeGetRequest());
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=0, stale-while-revalidate=30");
  });

  it("handles db error gracefully", async () => {
    mocks.findMany.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/student/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthorized();
    setCSRFPass();
    setValidBody();
  });

  it("returns 403 when not authenticated", async () => {
    setUnauthorized();
    const res = await PATCH(makePatchRequest({ messageIds: ["msg-1"] }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when CSRF fails", async () => {
    setCSRFFail();
    const res = await PATCH(makePatchRequest({ messageIds: ["msg-1"] }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid body", async () => {
    setInvalidBody();
    const res = await PATCH(makePatchRequest({ invalid: true }));
    expect(res.status).toBe(400);
  });

  it("returns 429 on rate limit", async () => {
    const rateLimit = await import("@/lib/rate-limit");
    vi.mocked(rateLimit.checkRateLimit).mockReturnValueOnce({
      limited: true, remaining: 0, resetAt: Date.now() + 60000,
    });
    const res = await PATCH(makePatchRequest({ messageIds: ["msg-1"] }));
    expect(res.status).toBe(429);
  });

  it("marks messages as read", async () => {
    mocks.updateMany.mockResolvedValue({ count: 2 });
    const res = await PATCH(makePatchRequest({ messageIds: ["msg-1", "msg-2"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("passes correct data to db updateMany", async () => {
    mocks.updateMany.mockResolvedValue({ count: 2 });
    setValidBody({ messageIds: ["msg-1", "msg-2"] });
    await PATCH(makePatchRequest({ messageIds: ["msg-1", "msg-2"] }));
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["msg-1", "msg-2"] }, toUserId: "student-1" },
      data: { read: true, readAt: expect.any(Date) },
    });
  });

  it("handles db error gracefully", async () => {
    mocks.updateMany.mockRejectedValue(new Error("DB down"));
    const res = await PATCH(makePatchRequest({ messageIds: ["msg-1"] }));
    expect(res.status).toBe(500);
  });
});
