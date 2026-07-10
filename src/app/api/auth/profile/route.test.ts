import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCSRF: vi.fn().mockReturnValue({ verified: true }),
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  activityLogCreate: vi.fn(),
  rateLimitResult: { limited: false, remaining: 9, resetAt: Date.now() + 900000 },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
      findFirst: mocks.userFindFirst,
      update: mocks.userUpdate,
    },
    activityLog: {
      create: mocks.activityLogCreate,
    },
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
  rateLimits: { profileUpdate: { max: 10, windowMs: 900000 } },
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { GET, PUT } from "./route";

const authedSession = { session: { userId: "user-1", role: "STUDENT" } };
const testUser = {
  id: "user-1",
  name: "Alice",
  email: "alice@test.com",
  emailVerified: new Date("2026-01-01"),
  phone: "+79991234567",
  role: "STUDENT",
  avatar: null,
  bio: null,
  university: null,
  group: null,
  createdAt: new Date("2026-01-01"),
};

function makeGetRequest() {
  return new Request("http://localhost:3000/api/auth/profile", { method: "GET" });
}

function makePutRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/auth/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/auth/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue(authedSession);
    mocks.userFindUnique.mockResolvedValue(testUser);
  });

  describe("success", () => {
    it("returns user profile", async () => {
      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.user.id).toBe("user-1");
      expect(json.user.name).toBe("Alice");
      expect(json.user.email).toBe("alice@test.com");
      expect(json.user.role).toBe("STUDENT");
    });

    it("returns all expected profile fields", async () => {
      const res = await GET();
      const json = await res.json();

      expect(json.user).toHaveProperty("id");
      expect(json.user).toHaveProperty("name");
      expect(json.user).toHaveProperty("email");
      expect(json.user).toHaveProperty("emailVerified");
      expect(json.user).toHaveProperty("phone");
      expect(json.user).toHaveProperty("role");
      expect(json.user).toHaveProperty("avatar");
      expect(json.user).toHaveProperty("bio");
      expect(json.user).toHaveProperty("university");
      expect(json.user).toHaveProperty("group");
      expect(json.user).toHaveProperty("createdAt");
    });
  });

  describe("authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mocks.requireAuth.mockResolvedValue({
        response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
      });

      const res = await GET();
      expect(res.status).toBe(401);
    });
  });

  describe("user not found", () => {
    it("returns 404 when user does not exist", async () => {
      mocks.userFindUnique.mockResolvedValue(null);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe("User not found");
    });
  });
});

describe("PUT /api/auth/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue(authedSession);
    mocks.requireCSRF.mockReturnValue({ verified: true });
    mocks.userFindUnique.mockResolvedValue(testUser);
    mocks.userUpdate.mockResolvedValue(testUser);
    mocks.activityLogCreate.mockResolvedValue({});
    mocks.rateLimitResult = { limited: false, remaining: 9, resetAt: Date.now() + 900000 };
  });

  describe("success", () => {
    it("updates profile name", async () => {
      const res = await PUT(makePutRequest({ name: "Alice Updated" }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(mocks.userUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({ name: "Alice Updated" }),
        })
      );
    });

    it("updates multiple fields at once", async () => {
      await PUT(makePutRequest({
        name: "Alice Updated",
        bio: "New bio text",
        university: "MIT",
      }));

      expect(mocks.userUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Alice Updated",
            bio: "New bio text",
            university: "MIT",
          }),
        })
      );
    });

    it("logs activity on profile update", async () => {
      await PUT(makePutRequest({ name: "Alice Updated" }));

      expect(mocks.activityLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            action: "PROFILE_UPDATE",
            entity: "User",
          }),
        })
      );
    });

    it("allows setting fields to null", async () => {
      mocks.userFindFirst.mockResolvedValue(null);

      await PUT(makePutRequest({ name: null, phone: null }));

      expect(mocks.userUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: null, phone: null }),
        })
      );
    });
  });

  describe("phone uniqueness", () => {
    it("returns 409 when phone is already in use", async () => {
      mocks.userFindFirst.mockResolvedValue({ id: "user-2", phone: "+79991234567" });

      const res = await PUT(makePutRequest({ phone: "+79991234567" }));
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain("already in use");
    });

    it("allows keeping same phone number", async () => {
      mocks.userFindFirst.mockResolvedValue(null);

      const res = await PUT(makePutRequest({ phone: "+79991234567" }));
      expect(res.status).toBe(200);
    });
  });

  describe("validation", () => {
    it("rejects invalid phone format", async () => {
      const res = await PUT(makePutRequest({ phone: "a".repeat(30) }));
      expect(res.status).toBe(400);
    });

    it("rejects name exceeding max length", async () => {
      const res = await PUT(makePutRequest({ name: "a".repeat(150) }));
      expect(res.status).toBe(400);
    });

    it("rejects invalid avatar URL", async () => {
      const res = await PUT(makePutRequest({ avatar: "not-a-url" }));
      expect(res.status).toBe(400);
    });
  });

  describe("authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mocks.requireAuth.mockResolvedValue({
        response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
      });

      const res = await PUT(makePutRequest({ name: "Alice" }));
      expect(res.status).toBe(401);
    });
  });

  describe("CSRF protection", () => {
    it("returns 403 when CSRF verification fails", async () => {
      mocks.requireCSRF.mockReturnValue({
        response: new Response(JSON.stringify({ error: "CSRF token missing" }), { status: 403 }),
      });

      const res = await PUT(makePutRequest({ name: "Alice" }));
      expect(res.status).toBe(403);
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 900000 };

      const res = await PUT(makePutRequest({ name: "Alice" }));
      expect(res.status).toBe(429);
    });
  });

  describe("server errors", () => {
    it("returns 500 on database error", async () => {
      mocks.userUpdate.mockRejectedValue(new Error("DB error"));

      const res = await PUT(makePutRequest({ name: "Alice" }));
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });

    it("handles P2002 unique constraint error", async () => {
      const p2002Error = new Error("Unique constraint failed on the fields: (`phone`)");
      p2002Error.message = "Unique constraint failed on the fields: (`phone`)";
      p2002Error.name = "PrismaClientKnownRequestError";
      Object.defineProperty(p2002Error, "message", {
        value: "Unique constraint failed on the fields: (`phone`) P2002",
      });
      mocks.userUpdate.mockRejectedValue(p2002Error);

      const res = await PUT(makePutRequest({ phone: "+79991234567" }));
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain("already in use");
    });
  });
});
