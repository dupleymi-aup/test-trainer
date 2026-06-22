import { describe, it, expect } from "vitest";
import { parseSearchParams } from "./api-error-handler";
import { z } from "zod";

function req(url: string): Request {
  return new Request(url);
}

describe("parseSearchParams — route schemas", () => {
  describe("leaderboardParamsSchema", () => {
    const schema = z.object({
      period: z.enum(["all", "week", "month"]).default("all"),
      limit: z.coerce.number().int().min(1).max(50).default(20),
      page: z.coerce.number().int().min(1).default(1),
      groupId: z.string().optional(),
    });

    it("applies defaults on empty params", () => {
      const r = parseSearchParams(req("http://localhost/api"), schema);
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data).toEqual({ period: "all", limit: 20, page: 1, groupId: undefined });
      }
    });

    it("parses all params", () => {
      const r = parseSearchParams(req("http://localhost/api?period=week&limit=10&page=2&groupId=g1"), schema);
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data).toEqual({ period: "week", limit: 10, page: 2, groupId: "g1" });
      }
    });

    it("rejects invalid period", () => {
      const r = parseSearchParams(req("http://localhost/api?period=year"), schema);
      expect(r.success).toBe(false);
    });

    it("rejects limit > 50", () => {
      const r = parseSearchParams(req("http://localhost/api?limit=51"), schema);
      expect(r.success).toBe(false);
    });

    it("rejects limit < 1", () => {
      const r = parseSearchParams(req("http://localhost/api?limit=0"), schema);
      expect(r.success).toBe(false);
    });

    it("rejects non-integer limit", () => {
      const r = parseSearchParams(req("http://localhost/api?limit=1.5"), schema);
      expect(r.success).toBe(false);
    });
  });

  describe("historyParamsSchema", () => {
    const schema = z.object({ taskId: z.string().optional() });

    it("returns defaults on empty", () => {
      const r = parseSearchParams(req("http://localhost/api"), schema);
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.taskId).toBeUndefined();
    });

    it("parses taskId", () => {
      const r = parseSearchParams(req("http://localhost/api?taskId=42"), schema);
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.taskId).toBe("42");
    });
  });

  describe("comparePeriodsParamsSchema", () => {
    const schema = z.object({
      period1Start: z.string().optional(),
      period1End: z.string().optional(),
      period2Start: z.string().optional(),
      period2End: z.string().optional(),
      groupId: z.string().optional(),
      university: z.string().optional(),
    });

    it("returns defaults on empty", () => {
      const r = parseSearchParams(req("http://localhost/api"), schema);
      expect(r.success).toBe(true);
      if (r.success) {
        expect(Object.values(r.data).every((v) => v === undefined)).toBe(true);
      }
    });

    it("parses all period dates", () => {
      const r = parseSearchParams(
        req("http://localhost/api?period1Start=2024-01-01&period1End=2024-06-30&period2Start=2024-07-01&period2End=2024-12-31&groupId=g1&university=MSU"),
        schema
      );
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.period1Start).toBe("2024-01-01");
        expect(r.data.period2End).toBe("2024-12-31");
        expect(r.data.groupId).toBe("g1");
        expect(r.data.university).toBe("MSU");
      }
    });
  });

  describe("dashboardParamsSchema", () => {
    const schema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      search: z.string().default(""),
      groupId: z.string().optional(),
      university: z.string().optional(),
      sortBy: z.enum(["avgScore", "name", "attemptsCount", "lastAttempt"]).default("avgScore"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    });

    it("applies all defaults", () => {
      const r = parseSearchParams(req("http://localhost/api"), schema);
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data).toEqual({
          page: 1, limit: 50, search: "", groupId: undefined,
          university: undefined, sortBy: "avgScore", sortOrder: "desc",
        });
      }
    });

    it("parses custom values", () => {
      const r = parseSearchParams(
        req("http://localhost/api?page=3&limit=25&search=test&sortBy=name&sortOrder=asc&groupId=g1&university=MIPT"),
        schema
      );
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.page).toBe(3);
        expect(r.data.limit).toBe(25);
        expect(r.data.search).toBe("test");
        expect(r.data.sortBy).toBe("name");
        expect(r.data.sortOrder).toBe("asc");
      }
    });

    it("rejects limit > 100", () => {
      const r = parseSearchParams(req("http://localhost/api?limit=101"), schema);
      expect(r.success).toBe(false);
    });

    it("rejects invalid sortBy", () => {
      const r = parseSearchParams(req("http://localhost/api?sortBy=invalid"), schema);
      expect(r.success).toBe(false);
    });

    it("rejects invalid sortOrder", () => {
      const r = parseSearchParams(req("http://localhost/api?sortOrder=up"), schema);
      expect(r.success).toBe(false);
    });
  });

  describe("sendRemindersParamsSchema", () => {
    const schema = z.object({
      hoursAhead: z.coerce.number().int().min(1).max(168).default(48),
      force: z.enum(["true", "false"]).default("false"),
    });

    it("applies defaults", () => {
      const r = parseSearchParams(req("http://localhost/api"), schema);
      expect(r.success).toBe(true);
      if (r.success) expect(r.data).toEqual({ hoursAhead: 48, force: "false" });
    });

    it("parses custom hoursAhead and force", () => {
      const r = parseSearchParams(req("http://localhost/api?hoursAhead=24&force=true"), schema);
      expect(r.success).toBe(true);
      if (r.success) expect(r.data).toEqual({ hoursAhead: 24, force: "true" });
    });

    it("rejects hoursAhead > 168", () => {
      const r = parseSearchParams(req("http://localhost/api?hoursAhead=169"), schema);
      expect(r.success).toBe(false);
    });

    it("rejects hoursAhead < 1", () => {
      const r = parseSearchParams(req("http://localhost/api?hoursAhead=0"), schema);
      expect(r.success).toBe(false);
    });

    it("rejects invalid force value", () => {
      const r = parseSearchParams(req("http://localhost/api?force=yes"), schema);
      expect(r.success).toBe(false);
    });
  });

  describe("teacher analyticsParamsSchema", () => {
    const schema = z.object({ groupId: z.string().min(1) });

    it("parses valid groupId", () => {
      const r = parseSearchParams(req("http://localhost/api?groupId=abc"), schema);
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.groupId).toBe("abc");
    });

    it("rejects empty groupId", () => {
      const r = parseSearchParams(req("http://localhost/api?groupId="), schema);
      expect(r.success).toBe(false);
    });

    it("rejects missing groupId", () => {
      const r = parseSearchParams(req("http://localhost/api"), schema);
      expect(r.success).toBe(false);
    });
  });

  describe("groupPerformanceParamsSchema", () => {
    const schema = z.object({
      groupId: z.string().min(1),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    });

    it("parses groupId only", () => {
      const r = parseSearchParams(req("http://localhost/api?groupId=g1"), schema);
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.groupId).toBe("g1");
        expect(r.data.startDate).toBeUndefined();
      }
    });

    it("parses all params", () => {
      const r = parseSearchParams(
        req("http://localhost/api?groupId=g1&startDate=2024-01-01&endDate=2024-12-31"),
        schema
      );
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.startDate).toBe("2024-01-01");
        expect(r.data.endDate).toBe("2024-12-31");
      }
    });

    it("rejects missing groupId", () => {
      const r = parseSearchParams(req("http://localhost/api"), schema);
      expect(r.success).toBe(false);
    });
  });

  describe("atRiskParamsSchema", () => {
    const schema = z.object({ groupId: z.string().min(1) });

    it("parses valid groupId", () => {
      const r = parseSearchParams(req("http://localhost/api?groupId=grp1"), schema);
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.groupId).toBe("grp1");
    });

    it("rejects missing groupId", () => {
      const r = parseSearchParams(req("http://localhost/api"), schema);
      expect(r.success).toBe(false);
    });
  });

  describe("teacher studentsParamsSchema", () => {
    const schema = z.object({
      groupId: z.string().min(1),
      search: z.string().optional(),
    });

    it("parses groupId only", () => {
      const r = parseSearchParams(req("http://localhost/api?groupId=g1"), schema);
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.groupId).toBe("g1");
        expect(r.data.search).toBeUndefined();
      }
    });

    it("parses groupId with search", () => {
      const r = parseSearchParams(req("http://localhost/api?groupId=g1&search=ivan"), schema);
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.search).toBe("ivan");
    });
  });

  describe("admin studentsParamsSchema", () => {
    const schema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(200).default(50),
      search: z.string().default(""),
      group: z.string().default(""),
      university: z.string().default(""),
      riskLevel: z.enum(["high", "medium", "low", "none", ""]).default(""),
    });

    it("applies all defaults", () => {
      const r = parseSearchParams(req("http://localhost/api"), schema);
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data).toEqual({
          page: 1, limit: 50, search: "", group: "", university: "", riskLevel: "",
        });
      }
    });

    it("parses custom values", () => {
      const r = parseSearchParams(
        req("http://localhost/api?page=2&limit=100&search=test&group=CS&university=MSU&riskLevel=high"),
        schema
      );
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.page).toBe(2);
        expect(r.data.limit).toBe(100);
        expect(r.data.riskLevel).toBe("high");
      }
    });

    it("rejects invalid riskLevel", () => {
      const r = parseSearchParams(req("http://localhost/api?riskLevel=critical"), schema);
      expect(r.success).toBe(false);
    });

    it("rejects limit > 200", () => {
      const r = parseSearchParams(req("http://localhost/api?limit=201"), schema);
      expect(r.success).toBe(false);
    });
  });

  describe("activityLogParamsSchema", () => {
    const schema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(200).default(50),
      action: z.string().optional(),
      userId: z.string().optional(),
    });

    it("applies defaults", () => {
      const r = parseSearchParams(req("http://localhost/api"), schema);
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data).toEqual({ page: 1, limit: 50, action: undefined, userId: undefined });
      }
    });

    it("parses action and userId filters", () => {
      const r = parseSearchParams(
        req("http://localhost/api?action=USER_CREATE&userId=u1&page=2"),
        schema
      );
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.action).toBe("USER_CREATE");
        expect(r.data.userId).toBe("u1");
        expect(r.data.page).toBe(2);
      }
    });
  });

  describe("enhancedParamsSchema", () => {
    const schema = z.object({
      groupId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      taskId: z.string().optional(),
    });

    it("returns all undefined on empty", () => {
      const r = parseSearchParams(req("http://localhost/api"), schema);
      expect(r.success).toBe(true);
      if (r.success) {
        expect(Object.values(r.data).every((v) => v === undefined)).toBe(true);
      }
    });

    it("parses all params", () => {
      const r = parseSearchParams(
        req("http://localhost/api?groupId=g1&startDate=2024-01-01&endDate=2024-12-31&taskId=5"),
        schema
      );
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.groupId).toBe("g1");
        expect(r.data.taskId).toBe("5");
      }
    });
  });

  describe("shared analyticsParamsSchema", () => {
    const paginationSchema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(200).default(50),
    });
    const dateRangeSchema = z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    });
    const groupFilterSchema = z.object({ groupId: z.string().optional() });
    const universityFilterSchema = z.object({ university: z.string().optional() });
    const schema = paginationSchema.merge(dateRangeSchema).merge(groupFilterSchema).merge(universityFilterSchema);

    it("applies pagination defaults, all other fields optional", () => {
      const r = parseSearchParams(req("http://localhost/api"), schema);
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.page).toBe(1);
        expect(r.data.limit).toBe(50);
        expect(r.data.dateFrom).toBeUndefined();
        expect(r.data.groupId).toBeUndefined();
      }
    });

    it("merges all four sub-schemas", () => {
      const r = parseSearchParams(
        req("http://localhost/api?page=2&limit=100&dateFrom=2024-01-01&dateTo=2024-06-30&groupId=g1&university=MIPT"),
        schema
      );
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.page).toBe(2);
        expect(r.data.limit).toBe(100);
        expect(r.data.dateFrom).toBe("2024-01-01");
        expect(r.data.groupId).toBe("g1");
        expect(r.data.university).toBe("MIPT");
      }
    });

    it("rejects limit > 200", () => {
      const r = parseSearchParams(req("http://localhost/api?limit=201"), schema);
      expect(r.success).toBe(false);
    });

    it("rejects page < 1", () => {
      const r = parseSearchParams(req("http://localhost/api?page=0"), schema);
      expect(r.success).toBe(false);
    });
  });
});
