import { describe, it, expect } from "vitest";
import {
  Permissions,
  hasPermission,
  requirePermission,
  RolePermissions,
  type Permission,
} from "./permissions";

describe("Permissions", () => {
  it("has all expected permission keys", () => {
    expect(Permissions.USERS_READ).toBe("users.read");
    expect(Permissions.GROUPS_CREATE).toBe("groups.create");
    expect(Permissions.TASKS_READ).toBe("tasks.read");
    expect(Permissions.ATTEMPTS_SUBMIT).toBe("attempts.submit");
    expect(Permissions.ANALYTICS_VIEW_ALL).toBe("analytics.view_all");
    expect(Permissions.SYSTEM_ALERTS).toBe("system.alerts");
  });

  it("no duplicate permission values", () => {
    const values = Object.values(Permissions);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("hasPermission", () => {
  it("returns true for student with tasks.read", () => {
    expect(hasPermission("STUDENT", Permissions.TASKS_READ)).toBe(true);
  });

  it("returns false for student with users.create", () => {
    expect(hasPermission("STUDENT", Permissions.USERS_CREATE)).toBe(false);
  });

  it("returns true for teacher with groups.create", () => {
    expect(hasPermission("TEACHER", Permissions.GROUPS_CREATE)).toBe(true);
  });

  it("returns false for teacher with users.create", () => {
    expect(hasPermission("TEACHER", Permissions.USERS_CREATE)).toBe(false);
  });

  it("returns true for admin with any permission", () => {
    expect(hasPermission("ADMIN", Permissions.USERS_CREATE)).toBe(true);
    expect(hasPermission("ADMIN", Permissions.SYSTEM_DATABASE)).toBe(true);
    expect(hasPermission("ADMIN", Permissions.GRADES_DELETE)).toBe(true);
  });

  it("returns false for unknown role", () => {
    expect(hasPermission("GUEST", Permissions.TASKS_READ)).toBe(false);
  });

  it("student cannot submit attempts.read_all", () => {
    expect(hasPermission("STUDENT", Permissions.ATTEMPTS_READ_ALL)).toBe(false);
  });

  it("teacher can submit attempts.read_all", () => {
    expect(hasPermission("TEACHER", Permissions.ATTEMPTS_READ_ALL)).toBe(true);
  });
});

describe("requirePermission", () => {
  it("returns allowed: true when permission exists", () => {
    const result = requirePermission("STUDENT", Permissions.TASKS_READ);
    expect(result).toEqual({ allowed: true });
  });

  it("returns allowed: false with error when permission missing", () => {
    const result = requirePermission("STUDENT", Permissions.USERS_CREATE);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.error).toContain("users.create");
      expect(result.error).toContain("Forbidden");
    }
  });
});

describe("RolePermissions", () => {
  it("student has exactly the expected permissions", () => {
    expect(RolePermissions.STUDENT).toContain(Permissions.TASKS_READ);
    expect(RolePermissions.STUDENT).toContain(Permissions.ATTEMPTS_SUBMIT);
    expect(RolePermissions.STUDENT).not.toContain(Permissions.USERS_CREATE);
  });

  it("admin has all permissions", () => {
    const allPerms = Object.values(Permissions) as Permission[];
    for (const perm of allPerms) {
      expect(RolePermissions.ADMIN).toContain(perm);
    }
  });

  it("teacher cannot manage users", () => {
    expect(RolePermissions.TEACHER).not.toContain(Permissions.USERS_CREATE);
    expect(RolePermissions.TEACHER).not.toContain(Permissions.USERS_DELETE);
  });
});
