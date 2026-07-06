import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    bcryptHash: vi.fn(),
    userFindFirst: vi.fn(),
    userCreate: vi.fn(),
    verificationTokenCreate: vi.fn(),
    sendEmail: vi.fn(),
  },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mocks.bcryptHash },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findFirst: mocks.userFindFirst,
      create: mocks.userCreate,
    },
    verificationToken: {
      create: mocks.verificationTokenCreate,
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  generateVerificationEmail: vi.fn().mockReturnValue({
    subject: "Verify your email",
    html: "<p>verify</p>",
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ limited: false, remaining: 5, resetAt: Date.now() + 60000 }),
  createRateLimitResponse: vi.fn().mockReturnValue(
    NextResponse.json({ error: "Too many requests" }, { status: 429 })
  ),
  rateLimits: { register: { windowMs: 60000, max: 5 } },
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/crypto", () => ({
  generateSecureToken: vi.fn().mockReturnValue("mock-token"),
}));

import { POST } from "./route";

const validBody = {
  name: "New User",
  email: "newuser@test.com",
  password: "Str0ng!Pass",
};

const createdUser = {
  id: "user-1",
  name: "New User",
  email: "newuser@test.com",
  phone: null,
  createdAt: new Date("2024-01-01"),
};

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.bcryptHash.mockResolvedValue("$2a$12$hashed");
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.userCreate.mockResolvedValue(createdUser);
    mocks.verificationTokenCreate.mockResolvedValue({});
    mocks.sendEmail.mockResolvedValue(undefined);
  });

  it("registers a new user successfully", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.message).toContain("User created");
    expect(data.user.email).toBe("newuser@test.com");
    expect(mocks.bcryptHash).toHaveBeenCalledWith("Str0ng!Pass", 12);
  });

  it("returns 409 when email already exists", async () => {
    mocks.userFindFirst.mockResolvedValue({
      email: "newuser@test.com",
      phone: null,
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("email already exists");
  });

  it("returns 409 when phone already exists", async () => {
    mocks.userFindFirst.mockResolvedValue({
      email: "other@test.com",
      phone: "+1234567890",
    });
    const res = await POST(makeRequest({ ...validBody, phone: "+1234567890" }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("phone number already exists");
  });

  it("returns 409 on Prisma unique constraint violation", async () => {
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.userCreate.mockRejectedValue(new Error("P2002 unique constraint"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
  });

  it("registers user as STUDENT by default", async () => {
    let capturedRole = "";
    mocks.userCreate.mockImplementation(async ({ data }: { data: { role: string } }) => {
      capturedRole = data.role;
      return createdUser;
    });
    await POST(makeRequest(validBody));
    expect(capturedRole).toBe("STUDENT");
  });

  it("honors explicit role selection", async () => {
    let capturedRole = "";
    mocks.userCreate.mockImplementation(async ({ data }: { data: { role: string } }) => {
      capturedRole = data.role;
      return createdUser;
    });
    await POST(makeRequest({ ...validBody, role: "TEACHER" }));
    expect(capturedRole).toBe("TEACHER");
  });

  it("still returns 201 when verification email sending fails", async () => {
    mocks.sendEmail.mockRejectedValue(new Error("SMTP down"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
  });

  it("returns 429 on rate limit", async () => {
    const rateLimit = await import("@/lib/rate-limit");
    vi.mocked(rateLimit.checkRateLimit).mockReturnValueOnce({
      limited: true,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
  });

  it("rejects invalid email format", async () => {
    const res = await POST(makeRequest({ ...validBody, email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("rejects weak password", async () => {
    const res = await POST(makeRequest({ ...validBody, password: "123" }));
    expect(res.status).toBe(400);
  });
});
