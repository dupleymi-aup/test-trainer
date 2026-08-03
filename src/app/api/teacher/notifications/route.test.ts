import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockActivityLogFindMany: vi.fn(),
    mockActivityLogCreate: vi.fn(),
    mockActivityLogDeleteMany: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockCreateRateLimitResponse: vi.fn(),
    guardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    csrfResult: null as { verified: true } | { response: NextResponse } | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    activityLog: {
      findMany: mocks.mockActivityLogFindMany,
      create: mocks.mockActivityLogCreate,
      deleteMany: mocks.mockActivityLogDeleteMany,
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.mockCheckRateLimit,
  createRateLimitResponse: mocks.mockCreateRateLimitResponse,
  rateLimits: { notifications: { max: 20, windowMs: 3600000 } },
}));

vi.mock("@/lib/admin-guard", () => {
  const m = mocks;
  return {
    requireTeacherOrAdmin: vi.fn().mockImplementation(async () => {
      if (m.guardResult) return m.guardResult;
      return { session: { userId: "teacher-1", role: "TEACHER" } };
    }),
  };
});

vi.mock("@/lib/csrf-middleware", () => {
  const m = mocks;
  return {
    requireCSRF: vi.fn().mockImplementation(async () => {
      if (m.csrfResult) return m.csrfResult;
      return { verified: true };
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
  parseRequestBody: vi.fn(),
}));

import { GET, POST, PATCH } from "./route";

function makeRequest(method: string, body?: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const init: RequestInit = { method, headers };
  if (body) init.body = JSON.stringify(body);
  return new Request("http://localhost:3000/api/teacher/notifications", init);
}

function setSession(role: string, userId: string) {
  mocks.guardResult = { session: { userId, role } };
}

describe("GET /api/teacher/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    const recent = new Date();
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    mocks.mockActivityLogFindMany.mockResolvedValue([
      {
        id: "n1",
        action: "ALERT_RISK_HIGH",
        details: "Student at risk",
        createdAt: recent,
      },
      {
        id: "n2",
        action: "ALERT_RISK_LOW",
        details: "Old alert",
        createdAt: old,
      },
    ]);
  });

  it("returns notifications with unread count for last 24h", async () => {
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications).toHaveLength(2);
    expect(body.notifications[0].type).toBe("RISK_HIGH");
    expect(body.notifications[0].read).toBe(false);
    expect(body.notifications[1].read).toBe(true);
    expect(body.unreadCount).toBe(1);
    expect(mocks.mockActivityLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "teacher-1",
          action: { startsWith: "ALERT_" },
          createdAt: { gte: expect.any(Date) },
        },
        take: 50,
      })
    );
  });

  it("returns 403 when unauthorized", async () => {
    mocks.guardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/teacher/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockActivityLogCreate.mockResolvedValue({
      id: "n1",
      action: "ALERT_RISK_HIGH",
      details: "Student at risk",
      createdAt: new Date(),
    });
  });

  it("creates a notification", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { type: "RISK_HIGH", message: "Student at risk", studentId: "u1" },
    });

    const res = await POST(makeRequest("POST", { type: "RISK_HIGH", message: "x" }));
    expect(res.status).toBe(200);
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith({
      data: {
        userId: "teacher-1",
        action: "ALERT_RISK_HIGH",
        entity: "Student",
        entityId: "u1",
        details: "Student at risk",
      },
    });
  });

  it("returns 429 when rate limited", async () => {
    mocks.mockCheckRateLimit.mockReturnValue({ limited: true, resetAt: 12345 });
    mocks.mockCreateRateLimitResponse.mockReturnValue(
      NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    );

    const res = await POST(makeRequest("POST", { type: "RISK_HIGH", message: "x" }));
    expect(res.status).toBe(429);
    expect(mocks.mockActivityLogCreate).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/teacher/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockActivityLogDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("dismisses own notification", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { notificationId: "n1", read: true },
    });

    const res = await PATCH(makeRequest("PATCH", { notificationId: "n1", read: true }));
    expect(res.status).toBe(200);
    expect(mocks.mockActivityLogDeleteMany).toHaveBeenCalledWith({
      where: {
        id: "n1",
        userId: "teacher-1",
        action: { startsWith: "ALERT_" },
      },
    });
  });

  it("returns 400 when trying to mark as unread", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { notificationId: "n1", read: false },
    });

    const res = await PATCH(makeRequest("PATCH", { notificationId: "n1", read: false }));
    expect(res.status).toBe(400);
    expect(mocks.mockActivityLogDeleteMany).not.toHaveBeenCalled();
  });

  it("returns 404 when notification not found", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { notificationId: "n1", read: true },
    });
    mocks.mockActivityLogDeleteMany.mockResolvedValue({ count: 0 });

    const res = await PATCH(makeRequest("PATCH", { notificationId: "n1", read: true }));
    expect(res.status).toBe(404);
  });
});
