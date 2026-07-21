import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockSystemSettingCount: vi.fn(),
    mockSystemSettingFindMany: vi.fn(),
    mockSystemSettingCreateMany: vi.fn(),
    mockSystemSettingUpsert: vi.fn(),
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
    systemSetting: {
      count: mocks.mockSystemSettingCount,
      findMany: mocks.mockSystemSettingFindMany,
      createMany: mocks.mockSystemSettingCreateMany,
      upsert: mocks.mockSystemSettingUpsert,
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
  rateLimits: { adminSettings: { window: 60000, max: 30 } },
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

import { GET, PATCH } from "./route";

function makeGetRequest() {
  return new Request("http://localhost:3000/api/admin/settings");
}

function makePatchRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/admin/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-csrf-token": "valid" },
    body: JSON.stringify(body),
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

const mockSettings = [
  { key: "allowRegistration", value: "true", updatedAt: new Date("2024-01-01") },
  { key: "maxLoginAttempts", value: "5", updatedAt: new Date("2024-01-01") },
  { key: "sessionDuration", value: "86400", updatedAt: new Date("2024-01-01") },
];

describe("GET /api/admin/settings", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.mockSystemSettingCount.mockResolvedValue(3);
    mocks.mockSystemSettingFindMany.mockResolvedValue(mockSettings);
  });

  it("returns all settings with parsed values", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settings).toHaveLength(3);
    expect(body.settings[0]).toEqual({
      key: "allowRegistration",
      value: true,
      updatedAt: expect.any(String),
    });
  });

  it("seeds defaults when no settings exist", async () => {
    mocks.mockSystemSettingCount.mockResolvedValue(0);
    mocks.mockSystemSettingFindMany.mockResolvedValue(mockSettings);
    mocks.mockSystemSettingCreateMany.mockResolvedValue({ count: 8 });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect(mocks.mockSystemSettingCreateMany).toHaveBeenCalled();
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("handles db error gracefully", async () => {
    mocks.mockSystemSettingFindMany.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/admin/settings", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.parseBodyResult = {
      success: true,
      data: { key: "maxLoginAttempts", value: 10 },
    };
    mocks.mockSystemSettingUpsert.mockResolvedValue({
      id: "s-1",
      key: "maxLoginAttempts",
      value: "10",
      updatedByUserId: "admin-1",
      updatedAt: new Date(),
    });
    mocks.mockActivityLogCreate.mockResolvedValue({});
  });

  it("upserts a setting and logs activity", async () => {
    const res = await PATCH(makePatchRequest({ key: "maxLoginAttempts", value: 10 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.setting.value).toBe(10);
    expect(mocks.mockSystemSettingUpsert).toHaveBeenCalled();
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "SETTING_UPDATE" }),
      })
    );
  });

  it("returns 400 on invalid body", async () => {
    mocks.parseBodyResult = { success: false, errorResponse: NextResponse.json({ error: "Invalid" }, { status: 400 }) };
    const res = await PATCH(makePatchRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await PATCH(makePatchRequest({ key: "maxLoginAttempts", value: 10 }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when CSRF fails", async () => {
    mocks.csrfResult = { response: NextResponse.json({ error: "CSRF fail" }, { status: 403 }) };
    const res = await PATCH(makePatchRequest({ key: "maxLoginAttempts", value: 10 }));
    expect(res.status).toBe(403);
  });

  it("handles db error gracefully", async () => {
    mocks.mockSystemSettingUpsert.mockRejectedValue(new Error("DB down"));
    const res = await PATCH(makePatchRequest({ key: "maxLoginAttempts", value: 10 }));
    expect(res.status).toBe(500);
  });
});
