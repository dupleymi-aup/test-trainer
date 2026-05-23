import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Mock modules BEFORE importing the route handler
// vi.mock is hoisted, so we use vi.hoisted to define the mock variables
// ---------------------------------------------------------------------------

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserFindMany: vi.fn(),
    mockUserCount: vi.fn(),
    mockUserFindFirst: vi.fn(),
    mockUserCreate: vi.fn(),
    mockActivityLogCreate: vi.fn(),
    loggerError: vi.fn(),
    adminGuardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: mocks.mockUserFindMany,
      count: mocks.mockUserCount,
      findFirst: mocks.mockUserFindFirst,
      create: mocks.mockUserCreate,
    },
    activityLog: {
      create: mocks.mockActivityLogCreate,
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
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

// ---------------------------------------------------------------------------
// Import route handlers AFTER mocks are set up
// ---------------------------------------------------------------------------

import { GET, POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(queryParams?: Record<string, string>) {
  const params = new URLSearchParams(queryParams);
  return new Request(`http://localhost:3000/api/admin/users?${params}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

function makePostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setAdminAuthorized() {
  mocks.adminGuardResult = { session: { userId: "admin-1", role: "ADMIN" } };
}

function setAdminUnauthorized() {
  mocks.adminGuardResult = {
    response: NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 }),
  };
}

const mockUsers = [
  {
    id: "user-1",
    name: "Alice",
    email: "alice@example.com",
    phone: "+79001111111",
    role: "STUDENT",
    isActive: true,
    avatar: null,
    university: "MSU",
    group: null,
    createdAt: new Date("2024-01-01"),
    _count: { attempts: 5, groups: 1 },
  },
  {
    id: "user-2",
    name: "Bob",
    email: "bob@example.com",
    phone: "+79002222222",
    role: "TEACHER",
    isActive: true,
    avatar: null,
    university: null,
    group: null,
    createdAt: new Date("2024-02-01"),
    _count: { attempts: 0, groups: 0 },
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminAuthorized();
    mocks.mockUserFindMany.mockResolvedValue(mockUsers);
    mocks.mockUserCount.mockResolvedValue(mockUsers.length);
  });

  // =========================================================================
  // 1. Successful user listing
  // =========================================================================

  describe("successful user listing", () => {
    it("returns users with pagination", async () => {
      const req = makeGetRequest();
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.users).toHaveLength(2);
      expect(json.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it("uses default pagination (page=1, limit=20)", async () => {
      const req = makeGetRequest();
      await GET(req);

      expect(mocks.mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });

    it("respects custom page and limit parameters", async () => {
      const req = makeGetRequest({ page: "2", limit: "10" });
      await GET(req);

      expect(mocks.mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it("filters by role when provided", async () => {
      const req = makeGetRequest({ role: "STUDENT" });
      await GET(req);

      expect(mocks.mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: "STUDENT",
          }),
        })
      );
    });

    it("does NOT filter by role when role=ALL", async () => {
      const req = makeGetRequest({ role: "ALL" });
      await GET(req);

      const callArgs = mocks.mockUserFindMany.mock.calls[0][0];
      expect(callArgs.where.role).toBeUndefined();
    });

    it("filters by search term on name, email, and phone", async () => {
      const req = makeGetRequest({ search: "alice" });
      await GET(req);

      expect(mocks.mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: "alice" } },
              { email: { contains: "alice" } },
              { phone: { contains: "alice" } },
            ]),
          }),
        })
      );
    });

    it("excludes soft-deleted users by default", async () => {
      const req = makeGetRequest();
      await GET(req);

      expect(mocks.mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });

    it("includes soft-deleted users when showDeleted=true", async () => {
      const req = makeGetRequest({ showDeleted: "true" });
      await GET(req);

      const callArgs = mocks.mockUserFindMany.mock.calls[0][0];
      expect(callArgs.where.deletedAt).toBeUndefined();
    });

    it("sorts by createdAt desc by default", async () => {
      const req = makeGetRequest();
      await GET(req);

      expect(mocks.mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("sorts by name when sortBy=name", async () => {
      const req = makeGetRequest({ sortBy: "name", sortDir: "asc" });
      await GET(req);

      expect(mocks.mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: { sort: "asc" } },
        })
      );
    });

    it("sorts by attempts count when sortBy=attempts", async () => {
      const req = makeGetRequest({ sortBy: "attempts", sortDir: "desc" });
      await GET(req);

      expect(mocks.mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { attempts: { _count: "desc" } },
        })
      );
    });

    it("selects required user fields including _count", async () => {
      const req = makeGetRequest();
      await GET(req);

      expect(mocks.mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            email: true,
            role: true,
            _count: {
              select: {
                attempts: true,
                groups: true,
              },
            },
          }),
        })
      );
    });
  });

  // =========================================================================
  // 2. Authorization
  // =========================================================================

  describe("authorization", () => {
    it("returns 403 when user is not admin", async () => {
      setAdminUnauthorized();

      const req = makeGetRequest();
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("Forbidden: admin access required");
    });
  });

  // =========================================================================
  // 3. Error handling
  // =========================================================================

  describe("error handling", () => {
    it("returns 500 when database query fails", async () => {
      mocks.mockUserFindMany.mockRejectedValueOnce(new Error("DB error"));

      const req = makeGetRequest();
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Failed to fetch users");
    });
  });
});

// ===========================================================================
// POST /api/admin/users — Create user (admin only)
// ===========================================================================

describe("POST /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdminAuthorized();
    mocks.mockUserFindFirst.mockResolvedValue(null);
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
    mocks.mockUserCreate.mockResolvedValue({
      id: "new-user-1",
      name: "New User",
      email: "new@example.com",
      phone: "+79009999999",
      role: "STUDENT",
      isActive: true,
      createdAt: new Date(),
    });
  });

  const validCreatePayload = {
    name: "New User",
    email: "new@example.com",
    phone: "+79009999999",
    password: "SecurePass123!",
    role: "STUDENT" as const,
  };

  // =========================================================================
  // 1. Successful user creation
  // =========================================================================

  describe("successful user creation", () => {
    it("creates a user and returns 201", async () => {
      const req = makePostRequest(validCreatePayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.user).toMatchObject({
        id: "new-user-1",
        name: "New User",
        email: "new@example.com",
        role: "STUDENT",
      });
    });

    it("creates user with TEACHER role", async () => {
      const req = makePostRequest({ ...validCreatePayload, role: "TEACHER" });
      await POST(req);

      expect(mocks.mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: "TEACHER",
          }),
        })
      );
    });

    it("creates user with ADMIN role", async () => {
      const req = makePostRequest({ ...validCreatePayload, role: "ADMIN" });
      await POST(req);

      expect(mocks.mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: "ADMIN",
          }),
        })
      );
    });

    it("normalizes email to lowercase", async () => {
      const req = makePostRequest({ ...validCreatePayload, email: "NEW@Example.COM" });
      await POST(req);

      expect(mocks.mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "new@example.com",
          }),
        })
      );
    });

    it("creates activity log entry", async () => {
      const req = makePostRequest(validCreatePayload);
      await POST(req);

      expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "admin-1",
            action: "USER_CREATE",
            entity: "User",
          }),
        })
      );
    });
  });

  // =========================================================================
  // 2. Validation errors
  // =========================================================================

  describe("validation errors", () => {
    it("rejects missing password with 400", async () => {
      const { password, ...payload } = validCreatePayload;
      const req = makePostRequest(payload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid data");
    });

    it("rejects password shorter than 8 characters with 400", async () => {
      const req = makePostRequest({ ...validCreatePayload, password: "short" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid data");
    });

    it("rejects invalid role with 400", async () => {
      const req = makePostRequest({ ...validCreatePayload, role: "SUPERADMIN" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid data");
    });

    it("rejects invalid email format with 400", async () => {
      const req = makePostRequest({ ...validCreatePayload, email: "not-an-email" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid data");
    });

    it("accepts optional name (name is optional)", async () => {
      const { name, ...payload } = validCreatePayload;
      const req = makePostRequest(payload);
      const res = await POST(req);

      expect(res.status).toBe(201);
    });

    it("accepts null email", async () => {
      const req = makePostRequest({ ...validCreatePayload, email: null });
      const res = await POST(req);

      expect(res.status).toBe(201);
    });

    it("accepts null phone", async () => {
      const req = makePostRequest({ ...validCreatePayload, phone: null });
      const res = await POST(req);

      expect(res.status).toBe(201);
    });
  });

  // =========================================================================
  // 3. Duplicate user rejection
  // =========================================================================

  describe("duplicate user rejection", () => {
    it("rejects duplicate email with 409", async () => {
      mocks.mockUserFindFirst.mockResolvedValue({ id: "existing", email: "new@example.com" });

      const req = makePostRequest(validCreatePayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain("already exists");
    });

    it("rejects duplicate phone with 409", async () => {
      mocks.mockUserFindFirst.mockResolvedValue({ id: "existing", phone: "+79009999999" });

      const req = makePostRequest(validCreatePayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain("already exists");
    });
  });

  // =========================================================================
  // 4. Authorization
  // =========================================================================

  describe("authorization", () => {
    it("returns 403 when user is not admin", async () => {
      setAdminUnauthorized();

      const req = makePostRequest(validCreatePayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("Forbidden: admin access required");
    });

    it("does NOT attempt to create user when not authorized", async () => {
      setAdminUnauthorized();

      const req = makePostRequest(validCreatePayload);
      await POST(req);

      expect(mocks.mockUserCreate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. Error handling
  // =========================================================================

  describe("error handling", () => {
    it("returns 500 when database creation fails", async () => {
      mocks.mockUserCreate.mockRejectedValueOnce(new Error("DB error"));

      const req = makePostRequest(validCreatePayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Failed to create user");
    });
  });
});
