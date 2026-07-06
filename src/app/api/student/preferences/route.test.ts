import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    requireStudent: vi.fn(),
    requireCSRF: vi.fn(),
    userFindUnique: vi.fn(),
    userUpdate: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
  },
}));

vi.mock("@/lib/admin-guard", () => ({
  requireStudent: mocks.requireStudent,
}));

vi.mock("@/lib/csrf-middleware", () => ({
  requireCSRF: mocks.requireCSRF,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ limited: false, resetAt: Date.now() + 60000 }),
  createRateLimitResponse: vi.fn().mockReturnValue(
    NextResponse.json({ error: "Too many requests" }, { status: 429 })
  ),
  rateLimits: { studentPreferences: { window: 60000, max: 20 } },
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET, PATCH } from "./route";

const mockSession = { userId: "student-1", role: "STUDENT" };

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost:3000/api/student/preferences", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/student/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireStudent.mockResolvedValue({ session: mockSession });
    mocks.userFindUnique.mockResolvedValue({
      notificationPreferences: JSON.stringify({ email: true, sms: true, inApp: false }),
    });
  });

  it("returns stored preferences", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preferences).toEqual({ email: true, sms: true, inApp: false });
  });

  it("returns defaults when no preferences stored", async () => {
    mocks.userFindUnique.mockResolvedValue({ notificationPreferences: null });
    const res = await GET();
    const body = await res.json();
    expect(body.preferences).toEqual({ email: true, sms: false, inApp: true });
  });

  it("returns defaults on corrupt JSON", async () => {
    mocks.userFindUnique.mockResolvedValue({ notificationPreferences: "not-json" });
    const res = await GET();
    const body = await res.json();
    expect(body.preferences).toEqual({ email: true, sms: false, inApp: true });
  });

  it("returns 401 when not authenticated", async () => {
    mocks.requireStudent.mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("handles db error gracefully", async () => {
    mocks.userFindUnique.mockRejectedValue(new Error("DB down"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/student/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireStudent.mockResolvedValue({ session: mockSession });
    mocks.requireCSRF.mockResolvedValue({ ok: true });
    mocks.userFindUnique.mockResolvedValue({
      notificationPreferences: JSON.stringify({ email: true, sms: false, inApp: true }),
    });
    mocks.userUpdate.mockResolvedValue({});
  });

  it("updates preferences partially", async () => {
    const res = await PATCH(makeRequest("PATCH", { sms: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preferences).toEqual({ email: true, sms: true, inApp: true });
    expect(mocks.userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "student-1" },
        data: { notificationPreferences: expect.any(String) },
      })
    );
  });

  it("returns 401 when not authenticated", async () => {
    mocks.requireStudent.mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PATCH(makeRequest("PATCH", { email: false }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when CSRF fails", async () => {
    mocks.requireCSRF.mockResolvedValue({
      response: NextResponse.json({ error: "CSRF missing" }, { status: 403 }),
    });
    const res = await PATCH(makeRequest("PATCH", { email: false }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost:3000/api/student/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid fields", async () => {
    const res = await PATCH(makeRequest("PATCH", { email: "yes" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 on rate limit", async () => {
    const rateLimit = await import("@/lib/rate-limit");
    vi.mocked(rateLimit.checkRateLimit).mockReturnValueOnce({
      limited: true,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });
    const res = await PATCH(makeRequest("PATCH", { email: false }));
    expect(res.status).toBe(429);
  });

  it("handles db error gracefully", async () => {
    mocks.userUpdate.mockRejectedValue(new Error("DB down"));
    const res = await PATCH(makeRequest("PATCH", { email: false }));
    expect(res.status).toBe(500);
  });
});
