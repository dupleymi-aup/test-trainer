import { describe, it, expect, beforeEach, vi } from "vitest";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    requireAuth: vi.fn(),
    requireCSRF: vi.fn().mockReturnValue({ verified: true }),
    userFindUnique: vi.fn(),
    userFindFirst: vi.fn(),
    userUpdate: vi.fn(),
    activityLogCreate: vi.fn(),
    rateLimitResult: { limited: false, remaining: 9, resetAt: Date.now() + 3600000 },
    getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
      findFirst: mocks.userFindFirst,
      update: mocks.userUpdate,
    },
    activityLog: { create: mocks.activityLogCreate },
  },
}));

vi.mock("@/lib/admin-guard", () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/csrf-middleware", () => ({
  requireCSRF: mocks.requireCSRF,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockImplementation(() => mocks.rateLimitResult),
  rateLimits: { profileUpdate: { max: 30, windowMs: 3600000 } },
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
  getClientIp: mocks.getClientIp,
}));

import { GET, PUT } from "./route";

const authedSession = { session: { userId: "user-1", role: "STUDENT" } };
const profileUser = {
  id: "user-1",
  name: "Test User",
  email: "test@test.com",
  emailVerified: new Date(),
  phone: "+1234567890",
  role: "STUDENT",
  avatar: null,
  bio: null,
  university: null,
  group: null,
  createdAt: new Date("2024-01-01"),
};

function makePutRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/auth/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// =========================================================================
// GET /api/auth/profile
// =========================================================================

describe("GET /api/auth/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue(authedSession);
    mocks.userFindUnique.mockResolvedValue(profileUser);
  });

  it("returns user profile for authenticated user", async () => {
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user.email).toBe("test@test.com");
    expect(json.user.name).toBe("Test User");
  });

  it("returns 401 when not authenticated", async () => {
    mocks.requireAuth.mockResolvedValue({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found in DB", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("User not found");
  });

  it("does NOT expose hashedPassword in response", async () => {
    const res = await GET();
    const json = await res.json();

    expect(json.user.hashedPassword).toBeUndefined();
  });
});

// =========================================================================
// PUT /api/auth/profile
// =========================================================================

describe("PUT /api/auth/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue(authedSession);
    mocks.userFindUnique.mockResolvedValue(profileUser);
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.userUpdate.mockResolvedValue({ ...profileUser, name: "Updated" });
    mocks.activityLogCreate.mockResolvedValue({});
    mocks.requireCSRF.mockReturnValue({ verified: true });
    mocks.rateLimitResult = { limited: false, remaining: 9, resetAt: Date.now() + 3600000 };
  });

  // --- Successful updates ---

  it("updates profile name successfully", async () => {
    const res = await PUT(makePutRequest({ name: "New Name" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user.name).toBe("Updated");
  });

  it("logs profile update activity", async () => {
    await PUT(makePutRequest({ name: "New Name" }));

    expect(mocks.activityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          action: "PROFILE_UPDATE",
        }),
      })
    );
  });

  it("trims whitespace from name", async () => {
    let capturedData: Record<string, string | null> = {};
    mocks.userUpdate.mockImplementation(async ({ data }: { data: Record<string, string | null> }) => {
      capturedData = data;
      return { ...profileUser, name: "Trimmed" };
    });

    await PUT(makePutRequest({ name: "  Trimmed  " }));

    expect(capturedData.name).toBe("Trimmed");
  });

  it("sets null for empty name string", async () => {
    let capturedData: Record<string, string | null> = {};
    mocks.userUpdate.mockImplementation(async ({ data }: { data: Record<string, string | null> }) => {
      capturedData = data;
      return { ...profileUser, name: null };
    });

    await PUT(makePutRequest({ name: "" }));

    expect(capturedData.name).toBeNull();
  });

  // --- Phone uniqueness ---

  it("returns 409 when phone is already taken by another user", async () => {
    mocks.userFindFirst.mockResolvedValue({ id: "other-user", phone: "+9999999999" });

    const res = await PUT(makePutRequest({ phone: "+9999999999" }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toContain("phone number is already in use");
  });

  it("allows keeping the same phone number", async () => {
    mocks.userFindFirst.mockResolvedValue(null);

    const res = await PUT(makePutRequest({ phone: "+1234567890" }));

    expect(res.status).toBe(200);
  });

  // --- Validation ---

  it("rejects invalid avatar URL", async () => {
    const res = await PUT(makePutRequest({ avatar: "not-a-url" }));
    expect(res.status).toBe(400);
  });

  it("rejects name longer than 100 characters", async () => {
    const res = await PUT(makePutRequest({ name: "x".repeat(101) }));
    expect(res.status).toBe(400);
  });

  it("rejects bio longer than 500 characters", async () => {
    const res = await PUT(makePutRequest({ bio: "x".repeat(501) }));
    expect(res.status).toBe(400);
  });

  // --- Authentication ---

  it("returns 401 when not authenticated", async () => {
    mocks.requireAuth.mockResolvedValue({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const res = await PUT(makePutRequest({ name: "New Name" }));

    expect(res.status).toBe(401);
  });

  // --- CSRF ---

  it("returns 403 when CSRF verification fails", async () => {
    mocks.requireCSRF.mockReturnValue({
      response: new Response(JSON.stringify({ error: "CSRF token missing" }), { status: 403 }),
    });

    const res = await PUT(makePutRequest({ name: "New Name" }));

    expect(res.status).toBe(403);
  });

  // --- Rate limiting ---

  it("returns 429 when rate limited", async () => {
    mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 3600000 };

    const res = await PUT(makePutRequest({ name: "New Name" }));
    const json = await res.json();

    expect(res.status).toBe(429);
  });

  // --- Prisma unique constraint ---

  it("returns 409 on Prisma unique constraint violation (P2002)", async () => {
    mocks.userUpdate.mockRejectedValue(new Error("P2002 unique constraint"));

    const res = await PUT(makePutRequest({ phone: "+1111111111" }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toContain("phone number is already in use");
  });

  // --- Server errors ---

  it("returns 500 when database update fails with non-P2002 error", async () => {
    mocks.userUpdate.mockRejectedValue(new Error("DB connection error"));

    const res = await PUT(makePutRequest({ name: "New Name" }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal server error");
  });
});
