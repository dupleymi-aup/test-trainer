import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockNotificationCount: vi.fn(),
    mockNotificationFindMany: vi.fn(),
    mockNotificationCreate: vi.fn(),
    mockNotificationUpdateMany: vi.fn(),
    mockNotificationDeleteMany: vi.fn(),
    mockActivityLogCreate: vi.fn(),
    loggerError: vi.fn(),
    adminGuardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    csrfResult: { verified: true } as { verified: boolean } | { response: NextResponse },
    parseBodyResult: null as
      | { success: true; data: Record<string, unknown> }
      | { success: false; errorResponse: NextResponse }
      | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    notification: {
      count: mocks.mockNotificationCount,
      findMany: mocks.mockNotificationFindMany,
      create: mocks.mockNotificationCreate,
      updateMany: mocks.mockNotificationUpdateMany,
      deleteMany: mocks.mockNotificationDeleteMany,
    },
    activityLog: {
      create: mocks.mockActivityLogCreate,
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
    requireAdmin: vi.fn().mockImplementation(async () => {
      if (m.adminGuardResult) return m.adminGuardResult;
      return { session: { userId: "admin-1", role: "ADMIN" } };
    }),
  };
});

vi.mock("@/lib/csrf-middleware", () => ({
  requireCSRF: vi.fn().mockImplementation(async () => mocks.csrfResult),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({
    limited: false,
    remaining: 20,
    resetAt: Date.now() + 60000,
  }),
  createRateLimitResponse: vi.fn().mockReturnValue(
    NextResponse.json({ error: "Too many requests" }, { status: 429 })
  ),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  rateLimits: { adminNotifications: { window: 60000, max: 30 } },
}));

vi.mock("@/lib/api-error-handler", () => {
  const m = mocks;
  return {
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
    parseRequestBody: vi.fn().mockImplementation(async () => m.parseBodyResult),
    unwrapGuard: vi.fn(<T>(result: { session: T } | { response: NextResponse }): T => {
      if ("response" in result) {
        const err = new Error("Unauthorized") as Error & { statusCode: number };
        err.statusCode = result.response.status;
        throw err;
      }
      return (result as { session: T }).session;
    }),
  };
});

import { GET, POST, PATCH, DELETE } from "./route";

function makeGetRequest(queryParams?: Record<string, string>) {
  const params = new URLSearchParams(queryParams);
  return new NextRequest(`http://localhost:3000/api/admin/notifications?${params}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/admin/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": "valid" },
    body: JSON.stringify(body),
  });
}

function makePatchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/admin/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-csrf-token": "valid" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(queryParams?: Record<string, string>) {
  const params = new URLSearchParams(queryParams);
  return new NextRequest(`http://localhost:3000/api/admin/notifications?${params}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "x-csrf-token": "valid" },
  });
}

function setAdminAuthorized() {
  mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
}

function setAdminUnauthorized() {
  mocks.adminGuardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

const mockNotifications = [
  {
    id: "notif-1",
    type: "alert",
    severity: "high",
    title: "Test Alert",
    message: "Something happened",
    entity: "User",
    entityId: "user-1",
    actionUrl: null,
    read: false,
    readAt: null,
    createdAt: new Date("2024-06-01T10:00:00Z"),
  },
  {
    id: "notif-2",
    type: "info",
    severity: "low",
    title: "Info",
    message: null,
    entity: null,
    entityId: null,
    actionUrl: null,
    read: true,
    readAt: new Date("2024-06-02T12:00:00Z"),
    createdAt: new Date("2024-06-01T09:00:00Z"),
  },
];

describe("GET /api/admin/notifications", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.mockNotificationCount.mockResolvedValue(2);
    mocks.mockNotificationFindMany.mockResolvedValue(mockNotifications);
  });

  it("returns paginated notifications", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
    expect(body.unreadCount).toBeDefined();
  });

  it("filters by severity", async () => {
    await GET(makeGetRequest({ severity: "high" }));
    expect(mocks.mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ severity: "high" }),
      })
    );
  });

  it("filters by unread only", async () => {
    await GET(makeGetRequest({ unreadOnly: "true" }));
    expect(mocks.mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ read: false }),
      })
    );
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("handles db error gracefully", async () => {
    mocks.mockNotificationFindMany.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

describe("POST /api/admin/notifications", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.parseBodyResult = {
      success: true,
      data: { type: "alert", severity: "high", title: "Test", message: "Msg" },
    };
    mocks.mockNotificationCreate.mockResolvedValue({
      id: "notif-new",
      type: "alert",
      severity: "high",
      title: "Test",
      message: "Msg",
      entity: null,
      entityId: null,
      actionUrl: null,
      createdAt: new Date(),
    });
  });

  it("creates a notification and returns 201", async () => {
    const res = await POST(makePostRequest({ type: "alert", severity: "high", title: "Test", message: "Msg" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.notification.title).toBe("Test");
  });

  it("returns 400 when title is missing", async () => {
    mocks.parseBodyResult = { success: false, errorResponse: NextResponse.json({ error: "Invalid body" }, { status: 400 }) };
    const res = await POST(makePostRequest({ severity: "high" }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await POST(makePostRequest({ type: "alert", severity: "high", title: "Test" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when CSRF fails", async () => {
    mocks.csrfResult = { response: NextResponse.json({ error: "CSRF fail" }, { status: 403 }) };
    const res = await POST(makePostRequest({ type: "alert", severity: "high", title: "Test" }));
    expect(res.status).toBe(403);
  });

  it("handles db error gracefully", async () => {
    mocks.mockNotificationCreate.mockRejectedValue(new Error("DB down"));
    const res = await POST(makePostRequest({ type: "alert", severity: "high", title: "Test" }));
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/admin/notifications", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.parseBodyResult = { success: true, data: { ids: ["notif-1"] } };
    mocks.mockNotificationUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("marks specific notifications as read", async () => {
    const res = await PATCH(makePatchRequest({ ids: ["notif-1"] }));
    expect(res.status).toBe(200);
    expect(mocks.mockNotificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["notif-1"] }, read: false },
      })
    );
  });

  it("marks all as read when ids is empty", async () => {
    mocks.parseBodyResult = { success: true, data: { ids: [] } };
    const res = await PATCH(makePatchRequest({ ids: [] }));
    expect(res.status).toBe(200);
    expect(mocks.mockNotificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { read: false },
      })
    );
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await PATCH(makePatchRequest({ ids: ["notif-1"] }));
    expect(res.status).toBe(403);
  });

  it("handles db error gracefully", async () => {
    mocks.mockNotificationUpdateMany.mockRejectedValue(new Error("DB down"));
    const res = await PATCH(makePatchRequest({ ids: ["notif-1"] }));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/admin/notifications", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockNotificationDeleteMany.mockResolvedValue({ count: 1 });
    mocks.mockActivityLogCreate.mockResolvedValue({});
  });

  it("deletes read notifications by default", async () => {
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(200);
    expect(mocks.mockNotificationDeleteMany).toHaveBeenCalledWith(
      { where: { read: true } }
    );
    expect(mocks.mockActivityLogCreate).toHaveBeenCalled();
  });

  it("deletes all notifications when ?all=true", async () => {
    const res = await DELETE(makeDeleteRequest({ all: "true" }));
    expect(res.status).toBe(200);
    expect(mocks.mockNotificationDeleteMany).toHaveBeenCalledWith({});
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(403);
  });

  it("returns 403 when CSRF fails", async () => {
    mocks.csrfResult = { response: NextResponse.json({ error: "CSRF fail" }, { status: 403 }) };
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(403);
  });

  it("handles db error gracefully", async () => {
    mocks.mockNotificationDeleteMany.mockRejectedValue(new Error("DB down"));
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(500);
  });
});
