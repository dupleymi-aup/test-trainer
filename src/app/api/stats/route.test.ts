import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserCount: vi.fn(),
    mockAttemptCount: vi.fn(),
    mockGroupCount: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockCreateRateLimitResponse: vi.fn(),
    mockGetClientIp: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { count: mocks.mockUserCount },
    attempt: { count: mocks.mockAttemptCount },
    group: { count: mocks.mockGroupCount },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.mockCheckRateLimit,
  createRateLimitResponse: mocks.mockCreateRateLimitResponse,
  getClientIp: mocks.mockGetClientIp,
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

function makeRequest() {
  return new Request("http://localhost:3000/api/stats");
}

describe("GET /api/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockUserCount.mockResolvedValue(42);
    mocks.mockAttemptCount.mockResolvedValue(1337);
    mocks.mockGroupCount.mockResolvedValue(7);
  });

  it("returns public stats", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ userCount: 42, attemptCount: 1337, groupCount: 7 });
  });

  it("returns 429 when rate limited", async () => {
    mocks.mockCheckRateLimit.mockReturnValue({ limited: true, resetAt: 12345 });
    mocks.mockCreateRateLimitResponse.mockReturnValue(
      NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    );

    const res = await GET(makeRequest());
    expect(res.status).toBe(429);
    expect(mocks.mockUserCount).not.toHaveBeenCalled();
  });
});
