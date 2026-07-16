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
    updateMany: vi.fn(),
    loggerError: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    reminder: {
      findMany: mocks.findMany,
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
  rateLimits: { studentReminders: { window: 60000, max: 30 } },
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

import { GET, PATCH } from "./route";

function makeReminder(id: string, overrides: Partial<{
  read: boolean; dueDate: Date; title: string; description: string; type: string; taskId: number | null; groupName: string;
}> = {}) {
  const dueDate = overrides.dueDate ?? new Date(Date.now() + 86400000);
  return {
    id,
    read: overrides.read ?? false,
    readAt: null,
    userId: "student-1",
    deadlineId: `dl-${id}`,
    createdAt: new Date(),
    deadline: {
      id: `dl-${id}`,
      title: overrides.title ?? "Deadline",
      description: overrides.description ?? "",
      dueDate,
      type: overrides.type ?? "homework",
      taskId: overrides.taskId ?? null,
      group: { id: "g-1", name: overrides.groupName ?? "Group A" },
    },
  };
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

function setValidBody(data?: Record<string, unknown>) {
  mocks.parseBodyResult = { success: true, data: data ?? { action: "mark_all_read" } };
}

function setInvalidBody() {
  mocks.parseBodyResult = {
    success: false,
    errorResponse: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
  };
}

function makePatchRequest(body?: unknown): Request {
  const init: RequestInit & { headers: Record<string, string> } = {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-csrf-token": "valid" },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request("http://localhost/api/student/reminders", init);
}

describe("GET /api/student/reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthorized();
  });

  it("returns 403 when not authenticated", async () => {
    setUnauthorized();
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns empty reminders with zero counts", async () => {
    mocks.findMany.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reminders).toEqual([]);
    expect(body.counts).toEqual({ total: 0, unread: 0, overdue: 0, nextWeek: 0 });
  });

  it("categorizes reminders into upcoming, overdue, nextWeek", async () => {
    const future = new Date(Date.now() + 7 * 86400000);
    const past = new Date(Date.now() - 86400000);
    const nextWeekDate = new Date(Date.now() + 3 * 86400000);

    mocks.findMany.mockResolvedValue([
      makeReminder("r1", { dueDate: future }),
      makeReminder("r2", { dueDate: past }),
      makeReminder("r3", { dueDate: nextWeekDate }),
    ]);

    const res = await GET();
    const body = await res.json();
    expect(body.reminders).toHaveLength(3);
    expect(body.upcoming).toHaveLength(2);
    expect(body.overdue).toHaveLength(1);
    expect(body.nextWeek).toHaveLength(2);
    expect(body.counts).toEqual({ total: 3, unread: 3, overdue: 1, nextWeek: 2 });
  });

  it("does not include read reminders in upcoming/overdue/nextWeek", async () => {
    const future = new Date(Date.now() + 86400000);
    mocks.findMany.mockResolvedValue([
      makeReminder("r1", { dueDate: future, read: true }),
    ]);
    const res = await GET();
    const body = await res.json();
    expect(body.upcoming).toHaveLength(0);
    expect(body.counts.unread).toBe(0);
  });

  it("queries by current user id", async () => {
    mocks.findMany.mockResolvedValue([]);
    await GET();
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { userId: "student-1" },
      include: expect.objectContaining({ deadline: expect.anything() }),
      orderBy: { deadline: { dueDate: "asc" } },
    });
  });

  it("handles db error gracefully", async () => {
    mocks.findMany.mockRejectedValue(new Error("DB down"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/student/reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthorized();
    setCSRFPass();
    setValidBody();
  });

  it("returns 403 when not authenticated", async () => {
    setUnauthorized();
    const res = await PATCH(makePatchRequest({ action: "mark_all_read" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when CSRF fails", async () => {
    setCSRFFail();
    const res = await PATCH(makePatchRequest({ action: "mark_all_read" }));
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
    const res = await PATCH(makePatchRequest({ action: "mark_all_read" }));
    expect(res.status).toBe(429);
  });

  it("marks all reminders as read", async () => {
    mocks.updateMany.mockResolvedValue({ count: 3 });
    const res = await PATCH(makePatchRequest({ action: "mark_all_read" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { userId: "student-1", read: false },
      data: { read: true, readAt: expect.any(Date) },
    });
  });

  it("marks a single reminder as read", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    setValidBody({ action: "mark_read", reminderId: "rem-1" });
    const res = await PATCH(makePatchRequest({ action: "mark_read", reminderId: "rem-1" }));
    expect(res.status).toBe(200);

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "rem-1", userId: "student-1" },
      data: { read: true, readAt: expect.any(Date) },
    });
  });

  it("handles db error gracefully", async () => {
    mocks.updateMany.mockRejectedValue(new Error("DB down"));
    const res = await PATCH(makePatchRequest({ action: "mark_all_read" }));
    expect(res.status).toBe(500);
  });
});
