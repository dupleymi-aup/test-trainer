import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockGetServerSession = vi.fn();
const mockDbFindUnique = vi.fn();
const mockDbFindMany = vi.fn();
const mockDbGroupFindUnique = vi.fn();
const mockHasPermission = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: () => mockGetServerSession(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => mockDbFindUnique(...args),
    },
    group: {
      findUnique: (...args: unknown[]) => mockDbGroupFindUnique(...args),
      findMany: (...args: unknown[]) => mockDbFindMany(...args),
    },
  },
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: (...args: unknown[]) => mockHasPermission(...args),
}));

import {
  requireAuth,
  requireAdmin,
  requireTeacherOrAdmin,
  requireStudent,
  requireTeacherGroup,
  getTeacherGroupIds,
  requirePermission,
  requirePermissionOrRole,
} from "./admin-guard";

function expectResponse(result: unknown): NextResponse {
  expect(result).toHaveProperty("response");
  return (result as { response: NextResponse }).response;
}

function expectSession(result: unknown, userId: string, role: string) {
  expect(result).toEqual({ session: { userId, role } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } });
  mockDbFindUnique.mockResolvedValue({ id: "user-1", role: "STUDENT", isActive: true });
});

describe("requireAuth", () => {
  it("returns 401 when no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const result = expectResponse(await requireAuth());
    expect(result.status).toBe(401);
    const json = await result.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 500 when DB query fails", async () => {
    mockDbFindUnique.mockRejectedValue(new Error("DB down"));
    const result = expectResponse(await requireAuth());
    expect(result.status).toBe(500);
  });

  it("returns 404 when user not found in DB", async () => {
    mockDbFindUnique.mockResolvedValue(null);
    const result = expectResponse(await requireAuth());
    expect(result.status).toBe(404);
  });

  it("returns 403 when account is inactive", async () => {
    mockDbFindUnique.mockResolvedValue({ id: "user-1", role: "STUDENT", isActive: false });
    const result = expectResponse(await requireAuth());
    expect(result.status).toBe(403);
  });

  it("returns session when authenticated and active", async () => {
    const result = await requireAuth();
    expectSession(result, "user-1", "STUDENT");
  });
});

describe("requireAdmin", () => {
  it("returns 401 when no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const result = expectResponse(await requireAdmin());
    expect(result.status).toBe(401);
  });

  it("returns 403 when user is not ADMIN", async () => {
    mockDbFindUnique.mockResolvedValue({ id: "user-1", role: "TEACHER", isActive: true });
    const result = expectResponse(await requireAdmin());
    expect(result.status).toBe(403);
  });

  it("returns 403 when admin is inactive", async () => {
    mockDbFindUnique.mockResolvedValue({ id: "user-1", role: "ADMIN", isActive: false });
    const result = expectResponse(await requireAdmin());
    expect(result.status).toBe(403);
  });

  it("returns session when user is active ADMIN", async () => {
    mockDbFindUnique.mockResolvedValue({ id: "user-1", role: "ADMIN", isActive: true });
    const result = await requireAdmin();
    expectSession(result, "user-1", "ADMIN");
  });
});

describe("requireTeacherOrAdmin", () => {
  it("returns 403 for STUDENT", async () => {
    mockDbFindUnique.mockResolvedValue({ id: "user-1", role: "STUDENT", isActive: true });
    const result = expectResponse(await requireTeacherOrAdmin());
    expect(result.status).toBe(403);
  });

  it("returns session for TEACHER", async () => {
    mockDbFindUnique.mockResolvedValue({ id: "user-1", role: "TEACHER", isActive: true });
    const result = await requireTeacherOrAdmin();
    expectSession(result, "user-1", "TEACHER");
  });

  it("returns session for ADMIN", async () => {
    mockDbFindUnique.mockResolvedValue({ id: "user-1", role: "ADMIN", isActive: true });
    const result = await requireTeacherOrAdmin();
    expectSession(result, "user-1", "ADMIN");
  });
});

describe("requireStudent", () => {
  it("returns 403 for TEACHER", async () => {
    mockDbFindUnique.mockResolvedValue({ id: "user-1", role: "TEACHER", isActive: true });
    const result = expectResponse(await requireStudent());
    expect(result.status).toBe(403);
  });

  it("returns session for STUDENT", async () => {
    const result = await requireStudent();
    expectSession(result, "user-1", "STUDENT");
  });

  it("returns 403 for inactive STUDENT", async () => {
    mockDbFindUnique.mockResolvedValue({ id: "user-1", role: "STUDENT", isActive: false });
    const result = expectResponse(await requireStudent());
    expect(result.status).toBe(403);
  });
});

describe("requireTeacherGroup", () => {
  it("returns 400 when groupId is empty", async () => {
    const session = { userId: "teacher-1", role: "TEACHER" };
    const result = expectResponse(await requireTeacherGroup("", session));
    expect(result.status).toBe(400);
  });

  it("returns 404 when group not found", async () => {
    mockDbGroupFindUnique.mockResolvedValue(null);
    const session = { userId: "teacher-1", role: "TEACHER" };
    const result = expectResponse(await requireTeacherGroup("group-1", session));
    expect(result.status).toBe(404);
  });

  it("returns 403 when teacher does not own group", async () => {
    mockDbGroupFindUnique.mockResolvedValue({ id: "group-1", createdByUserId: "other-teacher" });
    const session = { userId: "teacher-1", role: "TEACHER" };
    const result = expectResponse(await requireTeacherGroup("group-1", session));
    expect(result.status).toBe(403);
  });

  it("returns group when teacher owns it", async () => {
    mockDbGroupFindUnique.mockResolvedValue({ id: "group-1", createdByUserId: "teacher-1" });
    const session = { userId: "teacher-1", role: "TEACHER" };
    const result = await requireTeacherGroup("group-1", session);
    expect(result).toEqual({ group: { id: "group-1", createdByUserId: "teacher-1" } });
  });

  it("bypasses ownership check for ADMIN", async () => {
    mockDbGroupFindUnique.mockResolvedValue({ id: "group-1", createdByUserId: "other-teacher" });
    const session = { userId: "admin-1", role: "ADMIN" };
    const result = await requireTeacherGroup("group-1", session);
    expect(result).toEqual({ group: { id: "group-1", createdByUserId: "other-teacher" } });
  });
});

describe("getTeacherGroupIds", () => {
  it("returns all groups for ADMIN", async () => {
    mockDbFindMany.mockResolvedValue([{ id: "g1" }, { id: "g2" }]);
    const ids = await getTeacherGroupIds("admin-1", "ADMIN");
    expect(ids).toEqual(["g1", "g2"]);
  });

  it("returns only own groups for TEACHER", async () => {
    mockDbFindMany.mockResolvedValue([{ id: "g1" }]);
    const ids = await getTeacherGroupIds("teacher-1", "TEACHER");
    expect(ids).toEqual(["g1"]);
    expect(mockDbFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdByUserId: "teacher-1" } })
    );
  });
});

describe("requirePermission", () => {
  it("returns 403 when user lacks permission", async () => {
    mockHasPermission.mockReturnValue(false);
    const result = expectResponse(await requirePermission("manage_users" as never));
    expect(result.status).toBe(403);
  });

  it("returns session when user has permission", async () => {
    mockHasPermission.mockReturnValue(true);
    const result = await requirePermission("manage_users" as never);
    expectSession(result, "user-1", "STUDENT");
  });
});

describe("requirePermissionOrRole", () => {
  it("returns session when role is in allowedRoles", async () => {
    const result = await requirePermissionOrRole("manage_users" as never, ["STUDENT"]);
    expectSession(result, "user-1", "STUDENT");
  });

  it("returns session when user has permission", async () => {
    mockHasPermission.mockReturnValue(true);
    const result = await requirePermissionOrRole("manage_users" as never, []);
    expectSession(result, "user-1", "STUDENT");
  });

  it("returns 403 when role not in list and lacks permission", async () => {
    mockHasPermission.mockReturnValue(false);
    const result = expectResponse(await requirePermissionOrRole("manage_users" as never, ["ADMIN"]));
    expect(result.status).toBe(403);
  });
});
