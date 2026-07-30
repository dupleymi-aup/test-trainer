import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserCount: vi.fn(),
    mockAttemptCount: vi.fn(),
    mockGroupCount: vi.fn(),
    mockGroupTaskCount: vi.fn(),
    mockActivityLogCount: vi.fn(),
    mockSystemSettingCount: vi.fn(),
    mockVerificationCodeCount: vi.fn(),
    adminGuardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { count: mocks.mockUserCount },
    attempt: { count: mocks.mockAttemptCount },
    group: { count: mocks.mockGroupCount },
    groupTask: { count: mocks.mockGroupTaskCount },
    activityLog: { count: mocks.mockActivityLogCount },
    systemSetting: { count: mocks.mockSystemSettingCount },
    verificationCode: { count: mocks.mockVerificationCodeCount },
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
}));

import { GET } from "./route";

function makeGetRequest() {
  return new Request("http://localhost:3000/api/admin/database/health");
}

function setAdminAuthorized() {
  mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
}

function setAdminUnauthorized() {
  mocks.adminGuardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

describe("GET /api/admin/database/health", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.mockUserCount.mockResolvedValue(100);
    mocks.mockAttemptCount.mockResolvedValue(5000);
    mocks.mockGroupCount.mockResolvedValue(15);
    mocks.mockGroupTaskCount.mockResolvedValue(45);
    mocks.mockActivityLogCount.mockResolvedValue(1200);
    mocks.mockSystemSettingCount.mockResolvedValue(20);
    mocks.mockVerificationCodeCount.mockResolvedValue(8);
  });

  it("returns health status with table counts", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.tables.users).toBe(100);
    expect(body.tables.attempts).toBe(5000);
    expect(body.tables.groups).toBe(15);
    expect(body.tables.group_tasks).toBe(45);
    expect(body.tables.activity_logs).toBe(1200);
    expect(body.tables.system_settings).toBe(20);
    expect(body.tables.verification_codes).toBe(8);
    expect(body.totalRecords).toBe(6388);
    expect(body.timestamp).toBeDefined();
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("handles db error gracefully", async () => {
    mocks.mockUserCount.mockRejectedValue(new Error("DB connection failed"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});
