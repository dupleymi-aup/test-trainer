import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockSystemSettingFindMany: vi.fn(),
    mockUserFindMany: vi.fn(),
    mockGroupFindMany: vi.fn(),
    mockAttemptGroupBy: vi.fn(),
    mockAttemptAggregate: vi.fn(),
    mockNotificationCreate: vi.fn(),
    mockComputeStudentRisk: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockCreateRateLimitResponse: vi.fn(),
    mockGetClientIp: vi.fn(),
    adminGuardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    csrfResult: null as { verified: true } | { response: NextResponse } | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    systemSetting: { findMany: mocks.mockSystemSettingFindMany },
    user: { findMany: mocks.mockUserFindMany },
    group: { findMany: mocks.mockGroupFindMany },
    attempt: {
      groupBy: mocks.mockAttemptGroupBy,
      aggregate: mocks.mockAttemptAggregate,
    },
    notification: { create: mocks.mockNotificationCreate },
  },
}));

vi.mock("@/lib/risk-analysis", () => ({
  computeStudentRisk: mocks.mockComputeStudentRisk,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.mockCheckRateLimit,
  createRateLimitResponse: mocks.mockCreateRateLimitResponse,
  getClientIp: mocks.mockGetClientIp,
  rateLimits: { adminAlertCheck: { max: 10, windowMs: 60000 } },
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
}));

import { POST } from "./route";

function makeRequest() {
  return new Request("http://localhost:3000/api/admin/alerts/check-thresholds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

const riskStudent = {
  id: "s1",
  name: "Alice",
  email: "a@t.com",
  createdAt: new Date("2024-01-01"),
  attempts: [{ score: 20, ecCoverage: 0.1, bvCoverage: 0.1, createdAt: new Date("2024-05-01") }],
};

describe("POST /api/admin/alerts/check-thresholds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockSystemSettingFindMany.mockResolvedValue([]);
    mocks.mockUserFindMany.mockResolvedValue([riskStudent]);
    mocks.mockComputeStudentRisk.mockReturnValue({
      dropoutRisk: "high",
      riskFactors: ["low-activity"],
      trend: "declining",
    });
    mocks.mockGroupFindMany.mockResolvedValue([
      {
        id: "g1",
        name: "Group 1",
        members: [
          { userId: "s1" },
          { userId: "s2" },
          { userId: "s3" },
        ],
      },
    ]);
    mocks.mockAttemptGroupBy.mockResolvedValue([{ userId: "s1" }]);
    mocks.mockAttemptAggregate.mockReset();
    mocks.mockAttemptAggregate.mockResolvedValue({ _avg: { score: 80 } });
    mocks.mockNotificationCreate.mockResolvedValue({ id: "n1" });
  });

  it("creates notifications when thresholds exceeded", async () => {
    mocks.mockUserFindMany.mockResolvedValue([
      riskStudent,
      { ...riskStudent, id: "s2" },
      { ...riskStudent, id: "s3" },
      { ...riskStudent, id: "s4" },
      { ...riskStudent, id: "s5" },
    ]);
    mocks.mockGroupFindMany.mockResolvedValue([
      { id: "g1", name: "G1", members: [{ userId: "s1" }, { userId: "s2" }, { userId: "s3" }] },
      { id: "g2", name: "G2", members: [{ userId: "s4" }, { userId: "s5" }, { userId: "s6" }] },
    ]);
    mocks.mockAttemptGroupBy.mockResolvedValue([{ userId: "s1" }, { userId: "s4" }]);
    mocks.mockAttemptAggregate.mockReset();
    mocks.mockAttemptAggregate
      .mockResolvedValueOnce({ _avg: { score: 60 } })
      .mockResolvedValueOnce({ _avg: { score: 80 } });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notificationsCreated).toContain("RISK_THRESHOLD");
    expect(body.notificationsCreated).toContain("INACTIVE_GROUPS");
    expect(body.notificationsCreated).toContain("SCORE_DROP");
    expect(body.stats.highRiskCount).toBe(5);
    expect(body.stats.inactiveGroupCount).toBe(2);
    expect(body.stats.scoreDrop).toBe(25);
    expect(mocks.mockNotificationCreate).toHaveBeenCalledTimes(3);
    expect(mocks.mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "RISK_THRESHOLD", severity: "critical" }),
      })
    );
  });

  it("does not create notifications when thresholds not exceeded", async () => {
    mocks.mockUserFindMany.mockResolvedValue([]);
    mocks.mockComputeStudentRisk.mockReset();
    mocks.mockGroupFindMany.mockResolvedValue([]);
    mocks.mockAttemptGroupBy.mockResolvedValue([]);
    mocks.mockAttemptAggregate.mockReset();
    mocks.mockAttemptAggregate
      .mockResolvedValueOnce({ _avg: { score: 80 } })
      .mockResolvedValueOnce({ _avg: { score: 60 } });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notificationsCreated).toEqual([]);
    expect(mocks.mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("handles settings with unparsable JSON values", async () => {
    mocks.mockSystemSettingFindMany.mockResolvedValue([
      { key: "risk_student_threshold", value: "1" },
      { key: "inactive_group_threshold", value: '{"corrupt":true}' },
      { key: "avg_score_drop_threshold", value: '{"corrupt":true}' },
    ]);
    mocks.mockAttemptAggregate.mockReset();
    mocks.mockAttemptAggregate
      .mockResolvedValueOnce({ _avg: { score: 60 } })
      .mockResolvedValueOnce({ _avg: { score: 80 } });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stats.highRiskCount).toBe(1);
    expect(body.notificationsCreated).toEqual(["RISK_THRESHOLD"]);
  });

  it("returns 403 when unauthorized", async () => {
    mocks.adminGuardResult = {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    expect(mocks.mockNotificationCreate).not.toHaveBeenCalled();
  });
});
