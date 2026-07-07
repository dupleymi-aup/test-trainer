import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    bcryptCompare: vi.fn(),
    userFindFirst: vi.fn(),
  },
}));

vi.mock("bcryptjs", () => ({
  default: { compare: mocks.bcryptCompare },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findFirst: mocks.userFindFirst,
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ limited: false, resetAt: Date.now() + 60000 }),
  createRateLimitResponse: vi.fn().mockReturnValue(
    NextResponse.json({ error: "Too many requests" }, { status: 429 })
  ),
  rateLimits: { login: { window: 60000, max: 10 } },
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { POST } from "./route";

const activeUser = {
  id: "user-1",
  name: "John Doe",
  email: "john@test.com",
  phone: "+1234567890",
  role: "STUDENT",
  hashedPassword: "$2a$12$hash",
  isActive: true,
  deletedAt: null,
};

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.bcryptCompare.mockResolvedValue(true);
    mocks.userFindFirst.mockResolvedValue(activeUser);
  });

  it("logs in with email successfully", async () => {
    const res = await POST(makeRequest({ login: "john@test.com", password: "pass123" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe("john@test.com");
    expect(body.user.role).toBe("STUDENT");
    expect(mocks.userFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "john@test.com" } })
    );
  });

  it("logs in with phone successfully", async () => {
    mocks.userFindFirst.mockImplementation(async ({ where }: { where: Record<string, string | undefined> }) => {
      if (where.phone === "+1234567890") return activeUser;
      if (where.email === "john@test.com") return activeUser;
      return null;
    });
    const res = await POST(makeRequest({ login: "+1234567890", password: "pass123" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe("john@test.com");
  });

  it("rejects invalid credentials", async () => {
    mocks.bcryptCompare.mockResolvedValue(false);
    const res = await POST(makeRequest({ login: "john@test.com", password: "wrong" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Invalid");
  });

  it("rejects deactivated user", async () => {
    mocks.userFindFirst.mockResolvedValue({ ...activeUser, isActive: false });
    const res = await POST(makeRequest({ login: "john@test.com", password: "pass123" }));
    expect(res.status).toBe(401);
  });

  it("rejects soft-deleted user", async () => {
    mocks.userFindFirst.mockResolvedValue({ ...activeUser, deletedAt: new Date() });
    const res = await POST(makeRequest({ login: "john@test.com", password: "pass123" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user not found", async () => {
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.bcryptCompare.mockResolvedValue(false);
    const res = await POST(makeRequest({ login: "unknown@test.com", password: "pass123" }));
    expect(res.status).toBe(401);
  });

  it("rejects invalid JSON body", async () => {
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects missing fields", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("handles db error gracefully", async () => {
    mocks.userFindFirst.mockRejectedValue(new Error("DB down"));
    const res = await POST(makeRequest({ login: "john@test.com", password: "pass123" }));
    expect(res.status).toBe(500);
  });
});
