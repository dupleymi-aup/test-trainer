import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockGroupFindMany: vi.fn(),
    mockGroupCount: vi.fn(),
    mockGroupCreate: vi.fn(),
    mockActivityLogCreate: vi.fn(),
    loggerError: vi.fn(),
    adminGuardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    csrfResult: { verified: true } as { verified: boolean } | { response: NextResponse },
    rateLimitLimited: false,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    group: {
      findMany: mocks.mockGroupFindMany,
      count: mocks.mockGroupCount,
      create: mocks.mockGroupCreate,
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
    resetAt: Date.now() + 60000,
  }),
  createRateLimitResponse: vi.fn().mockReturnValue(
    NextResponse.json({ error: "Too many requests" }, { status: 429 })
  ),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  rateLimits: { adminGroupCrud: { window: 60000, max: 30 } },
}));

import { GET, POST } from "./route";

function makeGetRequest(queryParams?: Record<string, string>) {
  const params = new URLSearchParams(queryParams);
  return new Request(`http://localhost:3000/api/admin/groups?${params}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

function makePostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/admin/groups", {
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
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

const mockGroups = [
  {
    id: "group-1",
    name: "QA-2024",
    description: "Group A",
    createdAt: new Date("2024-01-01"),
    createdByUserId: "admin-1",
    _count: { members: 5 },
    createdBy: { name: "Admin", email: "admin@test.com" },
  },
  {
    id: "group-2",
    name: "Dev-2024",
    description: "Group B",
    createdAt: new Date("2024-02-01"),
    createdByUserId: "admin-1",
    _count: { members: 3 },
    createdBy: { name: "Admin", email: "admin@test.com" },
  },
];

describe("GET /api/admin/groups", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.rateLimitLimited = false;
    mocks.mockGroupFindMany.mockResolvedValue(mockGroups);
    mocks.mockGroupCount.mockResolvedValue(2);
  });

  it("returns paginated groups", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.groups).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.page).toBe(1);
  });

  it("respects page and limit query params", async () => {
    await GET(makeGetRequest({ page: "2", limit: "10" }));
    expect(mocks.mockGroupFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });

  it("clamps limit to max 100", async () => {
    await GET(makeGetRequest({ limit: "999" }));
    expect(mocks.mockGroupFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("returns empty list when no groups exist", async () => {
    mocks.mockGroupFindMany.mockResolvedValue([]);
    mocks.mockGroupCount.mockResolvedValue(0);
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.groups).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it("handles db error gracefully", async () => {
    mocks.mockGroupFindMany.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

describe("POST /api/admin/groups", () => {
  beforeEach(() => {
    setAdminAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockGroupCreate.mockResolvedValue({
      id: "group-new",
      name: "New Group",
      description: "Desc",
      _count: { members: 0 },
    });
    mocks.mockActivityLogCreate.mockResolvedValue({});
  });

  it("creates a group and returns 201", async () => {
    const res = await POST(makePostRequest({ name: "New Group", description: "Desc" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.group.name).toBe("New Group");
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is empty string", async () => {
    const res = await POST(makePostRequest({ name: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is too long", async () => {
    const res = await POST(makePostRequest({ name: "x".repeat(101) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when description is too long", async () => {
    const res = await POST(makePostRequest({ name: "Valid", description: "x".repeat(501) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost:3000/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when unauthorized", async () => {
    setAdminUnauthorized();
    const res = await POST(makePostRequest({ name: "New Group" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when CSRF fails", async () => {
    mocks.csrfResult = {
      response: NextResponse.json({ error: "CSRF token missing" }, { status: 403 }),
    };
    const res = await POST(makePostRequest({ name: "New Group" }));
    expect(res.status).toBe(403);
  });

  it("handles db error gracefully", async () => {
    mocks.mockGroupCreate.mockRejectedValue(new Error("DB down"));
    const res = await POST(makePostRequest({ name: "New Group" }));
    expect(res.status).toBe(500);
  });

  it("logs activity on group creation", async () => {
    await POST(makePostRequest({ name: "Log Test Group" }));
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "GROUP_CREATE",
          entity: "Group",
        }),
      })
    );
  });
});
