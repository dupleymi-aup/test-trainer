import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockSendDeadlineReminders: vi.fn(),
    mockSecureCompare: vi.fn(),
    mockActivityLogCreate: vi.fn(),
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
    activityLog: {
      create: mocks.mockActivityLogCreate,
    },
  },
}));

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
}));

import { GET } from "./route";

function makeGetRequest(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers["authorization"] = `Bearer ${token}`;
  return new Request("http://localhost:3000/api/cron/send-reminders", { headers });
}

describe("GET /api/cron/send-reminders", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret-123";
    mocks.mockSecureCompare.mockReturnValue(true);
    mocks.mockSendDeadlineReminders.mockResolvedValue({
      notified: 5,
      errors: 0,
      details: ["reminder-1", "reminder-2"],
    });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("sends reminders with valid token", async () => {
    const res = await GET(makeGetRequest("test-secret-123"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notified).toBe(5);
    expect(body.errors).toBe(0);
    expect(mocks.mockSecureCompare).toHaveBeenCalledWith("test-secret-123", "test-secret-123");
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledOnce();
  });

  it("returns 401 without authorization header", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    mocks.mockSecureCompare.mockReturnValue(false);
    const res = await GET(makeGetRequest("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeGetRequest("test-secret-123"));
    expect(res.status).toBe(500);
  });
});
