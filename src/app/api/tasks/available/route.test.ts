import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  userGroupFindMany: vi.fn(),
  groupTaskFindMany: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({
  getToken: mocks.getToken,
}));

vi.mock("@/lib/db", () => ({
  db: {
    userGroup: {
      findMany: mocks.userGroupFindMany,
    },
    groupTask: {
      findMany: mocks.groupTaskFindMany,
    },
  },
}));

import { GET } from "./route";

function makeRequest() {
  return new Request("http://localhost:3000/api/tasks/available");
}

describe("GET /api/tasks/available", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("unauthenticated", () => {
    it("returns all tasks when user is not authenticated", async () => {
      mocks.getToken.mockResolvedValue(null);

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.taskIds).toBeDefined();
      expect(Array.isArray(json.taskIds)).toBe(true);
      expect(json.taskIds.length).toBeGreaterThan(0);
    });
  });

  describe("no group membership", () => {
    it("returns all tasks when user has no groups", async () => {
      mocks.getToken.mockResolvedValue({ sub: "user-1" });
      mocks.userGroupFindMany.mockResolvedValue([]);

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.taskIds.length).toBeGreaterThan(0);
      expect(mocks.userGroupFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1" } })
      );
    });
  });

  describe("no restrictions", () => {
    it("returns all tasks when groups have no task restrictions", async () => {
      mocks.getToken.mockResolvedValue({ sub: "user-1" });
      mocks.userGroupFindMany.mockResolvedValue([
        { groupId: "group-1" },
        { groupId: "group-2" },
      ]);
      mocks.groupTaskFindMany.mockResolvedValue([]);

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.taskIds.length).toBeGreaterThan(0);
    });

    it("fetches groupTasks for user's groups", async () => {
      mocks.getToken.mockResolvedValue({ sub: "user-1" });
      mocks.userGroupFindMany.mockResolvedValue([
        { groupId: "group-1" },
        { groupId: "group-2" },
      ]);
      mocks.groupTaskFindMany.mockResolvedValue([]);

      await GET(makeRequest());

      expect(mocks.groupTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { groupId: { in: ["group-1", "group-2"] } },
        })
      );
    });
  });

  describe("with restrictions", () => {
    it("returns only whitelisted task IDs when restrictions exist", async () => {
      mocks.getToken.mockResolvedValue({ sub: "user-1" });
      mocks.userGroupFindMany.mockResolvedValue([{ groupId: "group-1" }]);
      mocks.groupTaskFindMany.mockResolvedValue([
        { taskId: 1 },
        { taskId: 3 },
        { taskId: 5 },
      ]);

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.taskIds).toEqual([1, 3, 5]);
    });

    it("deduplicates task IDs when multiple groups share the same task", async () => {
      mocks.getToken.mockResolvedValue({ sub: "user-1" });
      mocks.userGroupFindMany.mockResolvedValue([
        { groupId: "group-1" },
        { groupId: "group-2" },
      ]);
      mocks.groupTaskFindMany.mockResolvedValue([
        { taskId: 1 },
        { taskId: 1 },
        { taskId: 3 },
      ]);

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(json.taskIds).toEqual([1, 3]);
    });
  });

  describe("server errors", () => {
    it("returns 500 when database query fails", async () => {
      mocks.getToken.mockResolvedValue({ sub: "user-1" });
      mocks.userGroupFindMany.mockRejectedValue(new Error("DB error"));

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});
