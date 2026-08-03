import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserCount: vi.fn(),
    mockGroupCount: vi.fn(),
    mockAttemptCount: vi.fn(),
    mockAttemptAggregate: vi.fn(),
    mockUserFindMany: vi.fn(),
    mockNotificationCreate: vi.fn(),
    mockActivityLogCreate: vi.fn(),
    mockSendEmail: vi.fn(),
    mockSecureCompare: vi.fn(),
    mockLoggerError: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { count: mocks.mockUserCount, findMany: mocks.mockUserFindMany },
    group: { count: mocks.mockGroupCount },
    attempt: { count: mocks.mockAttemptCount, aggregate: mocks.mockAttemptAggregate },
    notification: { create: mocks.mockNotificationCreate },
    activityLog: { create: mocks.mockActivityLogCreate },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: mocks.mockSendEmail,
}));

vi.mock("@/lib/crypto", () => ({
  secureCompare: mocks.mockSecureCompare,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.mockLoggerError },
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

function makeRequest(authHeader?: string) {
  const headers: Record<string, string> = {};
  if (authHeader) headers.Authorization = authHeader;
  return new Request("http://localhost:3000/api/cron/scheduled-reports", { headers });
}

const riskStudent = {
  id: "s1",
  name: "Alice",
  email: "a@t.com",
  createdAt: new Date("2024-01-01"),
  attempts: [
    {
      score: 40,
      ecCoverage: 0.5,
      bvCoverage: 0.5,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
  ],
};

describe("GET /api/cron/scheduled-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockSecureCompare.mockReturnValue(true);
    mocks.mockUserCount.mockReset();
    mocks.mockUserCount.mockResolvedValueOnce(5); // totalStudents
    mocks.mockUserCount.mockResolvedValueOnce(2); // totalTeachers
    mocks.mockGroupCount.mockResolvedValueOnce(3);
    mocks.mockAttemptCount.mockResolvedValueOnce(100); // totalAttempts
    mocks.mockUserCount.mockResolvedValueOnce(3); // activeStudents30d
    mocks.mockAttemptAggregate.mockResolvedValue({ _avg: { score: 72.4 } });
    mocks.mockAttemptCount.mockResolvedValueOnce(12); // attemptsLastWeek
    mocks.mockUserFindMany.mockResolvedValueOnce([riskStudent]); // students
    mocks.mockUserFindMany.mockResolvedValueOnce([
      { email: "admin@test.com", name: "Admin" },
    ]); // admins
    mocks.mockSendEmail.mockResolvedValue({ messageId: "m1" });
    mocks.mockNotificationCreate.mockResolvedValue({ id: "n1" });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("returns 401 without valid bearer token", async () => {
    mocks.mockSecureCompare.mockReturnValue(false);
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
    expect(mocks.mockUserCount).not.toHaveBeenCalled();
  });

  it("returns 401 when CRON_SECRET not set", async () => {
    const originalSecret = process.env.CRON_SECRET;
    delete (process.env as Record<string, string | undefined>).CRON_SECRET;
    const res = await GET(makeRequest("Bearer whatever"));
    expect(res.status).toBe(401);
    (process.env as Record<string, string | undefined>).CRON_SECRET = originalSecret;
  });

  it("sends weekly report to admins and logs", async () => {
    const res = await GET(makeRequest("Bearer valid-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sentCount).toBe(1);
    expect(body.totalStudents).toBe(5);
    expect(body.avgScore).toBe(72);
    expect(body.highRiskCount).toBe(1);
    expect(mocks.mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "admin@test.com" })
    );
    expect(mocks.mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "SCHEDULED_REPORT" }),
      })
    );
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "CRON_SCHEDULED_REPORT" }),
      })
    );
  });

  it("skips when no admin users found", async () => {
    mocks.mockUserFindMany.mockReset();
    mocks.mockUserFindMany.mockResolvedValueOnce([riskStudent]);
    mocks.mockUserFindMany.mockResolvedValueOnce([]); // no admins

    const res = await GET(makeRequest("Bearer valid-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(mocks.mockSendEmail).not.toHaveBeenCalled();
  });

  it("continues when email fails and logs error", async () => {
    mocks.mockUserFindMany.mockReset();
    mocks.mockUserFindMany.mockResolvedValueOnce([riskStudent]);
    mocks.mockUserFindMany.mockResolvedValueOnce([
      { email: "a@test.com", name: "A" },
      { email: "b@test.com", name: "B" },
    ]);
    mocks.mockSendEmail.mockReset();
    mocks.mockSendEmail.mockRejectedValueOnce(new Error("SMTP down"));
    mocks.mockSendEmail.mockResolvedValue({ messageId: "m1" });

    const res = await GET(makeRequest("Bearer valid-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sentCount).toBe(1);
    expect(mocks.mockLoggerError).toHaveBeenCalled();
  });
});
