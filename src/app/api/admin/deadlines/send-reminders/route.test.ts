import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockSendDeadlineReminders: vi.fn(),
    mockForceFindMany: vi.fn(),
    mockReminderUpdate: vi.fn(),
    mockActivityLogCreate: vi.fn(),
    mockSecureCompare: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockCreateRateLimitResponse: vi.fn(),
    mockGetClientIp: vi.fn(),
    loggerInfo: vi.fn(),
    adminGuardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    csrfResult: null as { verified: true } | { response: NextResponse } | null,
  },
}));

vi.mock("@/lib/reminder-dispatch", () => ({
  sendDeadlineReminders: mocks.mockSendDeadlineReminders,
}));

vi.mock("@/lib/crypto", () => ({
  secureCompare: mocks.mockSecureCompare,
}));

vi.mock("@/lib/db", () => ({
  db: {
    deadline: {
      findMany: mocks.mockForceFindMany,
    },
    reminder: {
      update: mocks.mockReminderUpdate,
    },
    activityLog: {
      create: mocks.mockActivityLogCreate,
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: mocks.loggerInfo,
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.mockCheckRateLimit,
  createRateLimitResponse: mocks.mockCreateRateLimitResponse,
  getClientIp: mocks.mockGetClientIp,
  rateLimits: { adminDeadlineSendReminders: { max: 5, windowMs: 60000 } },
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
  parseSearchParams: vi.fn(),
}));

import { POST } from "./route";

function makePostRequest(queryString = "", token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["authorization"] = `Bearer ${token}`;
  return new Request(
    `http://localhost:3000/api/admin/deadlines/send-reminders?${queryString}`,
    { method: "POST", headers }
  );
}

function setAdminAuthorized() {
  mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
}

function setAdminUnauthorized() {
  mocks.adminGuardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

describe("POST /api/admin/deadlines/send-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret-123";
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockSecureCompare.mockReturnValue(false);
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockSendDeadlineReminders.mockResolvedValue({ sentCount: 3, failedCount: 0, errors: [] });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
    mocks.mockForceFindMany.mockResolvedValue([]);
  });

  it("sends reminders via dispatch service (default)", async () => {
    const { parseSearchParams } = await import("@/lib/api-error-handler");
    vi.mocked(parseSearchParams).mockReturnValue({
      success: true,
      data: { hoursAhead: 48, force: "false" as const },
    });

    const res = await POST(makePostRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sentCount).toBe(3);
    expect(mocks.mockSendDeadlineReminders).toHaveBeenCalledOnce();
    expect(mocks.mockActivityLogCreate).toHaveBeenCalled();
  });

  it("force-sends all unsent reminders when force=true", async () => {
    const { parseSearchParams } = await import("@/lib/api-error-handler");
    vi.mocked(parseSearchParams).mockReturnValue({
      success: true,
      data: { hoursAhead: 48, force: "true" as const },
    });
    mocks.mockForceFindMany
      .mockResolvedValueOnce([
        {
          id: "dl-1",
          reminders: [{ id: "rem-1" }, { id: "rem-2" }],
        },
      ])
      .mockResolvedValueOnce([]);
    mocks.mockReminderUpdate.mockResolvedValue({ id: "rem-1", sent: true });

    const res = await POST(makePostRequest("force=true"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sentCount).toBe(2);
    expect(mocks.mockReminderUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.mockSendDeadlineReminders).not.toHaveBeenCalled();
  });

  it("accepts cron secret for automated triggering", async () => {
    const { parseSearchParams } = await import("@/lib/api-error-handler");
    vi.mocked(parseSearchParams).mockReturnValue({
      success: true,
      data: { hoursAhead: 48, force: "false" as const },
    });
    mocks.mockSecureCompare.mockReturnValue(true);

    const res = await POST(makePostRequest("", "cron-secret-123"));
    expect(res.status).toBe(200);
    expect(mocks.mockSendDeadlineReminders).toHaveBeenCalledOnce();
  });

  it("returns 403 when unauthorized (no valid token or session)", async () => {
    setAdminUnauthorized();
    mocks.mockSecureCompare.mockReturnValue(false);
    const res = await POST(makePostRequest());
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid search params", async () => {
    const { parseSearchParams } = await import("@/lib/api-error-handler");
    vi.mocked(parseSearchParams).mockReturnValue({
      success: false,
      errorResponse: NextResponse.json({ error: "Invalid params" }, { status: 400 }),
    });

    const res = await POST(makePostRequest("hoursAhead=999"));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mocks.mockCheckRateLimit.mockReturnValue({ limited: true, resetAt: 99999 });
    mocks.mockCreateRateLimitResponse.mockReturnValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 })
    );
    const res = await POST(makePostRequest());
    expect(res.status).toBe(429);
  });
});
