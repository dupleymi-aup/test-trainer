import { describe, it, expect } from "vitest";
import {
  healthResponseSchema,
  studentAnalyticsResponseSchema,
  leaderboardResponseSchema,
} from "./api-types";

describe("healthResponseSchema", () => {
  const validHealth = {
    status: "healthy",
    version: "1.0.0",
    uptime: 12345,
    timestamp: new Date().toISOString(),
    database: { ok: true },
    mongodb: { ok: false, details: "not configured" },
    memory: { rss: 1000, heapTotal: 2000, heapUsed: 1000, external: 100 },
  };

  it("accepts valid health response", () => {
    const result = healthResponseSchema.safeParse(validHealth);
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = healthResponseSchema.safeParse({ ...validHealth, status: "unknown" });
    expect(result.success).toBe(false);
  });

  it("rejects negative uptime", () => {
    const result = healthResponseSchema.safeParse({ ...validHealth, uptime: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts degraded status", () => {
    const result = healthResponseSchema.safeParse({ ...validHealth, status: "degraded" });
    expect(result.success).toBe(true);
  });

  it("accepts unhealthy status", () => {
    const result = healthResponseSchema.safeParse({ ...validHealth, status: "unhealthy" });
    expect(result.success).toBe(true);
  });

  it("rejects missing memory fields", () => {
    const result = healthResponseSchema.safeParse({
      ...validHealth,
      memory: { rss: 1000 },
    });
    expect(result.success).toBe(false);
  });
});

describe("studentAnalyticsResponseSchema", () => {
  const validAnalytics = {
    attempts: 10,
    scoresOverTime: [{ date: "2026-01-01", score: 85, ecCoverage: 0.8, bvCoverage: 0.7 }],
    topicMastery: [{ topic: "EC", avgScore: 90, attempts: 5 }],
    taskBreakdown: [{ taskId: "1", taskName: "Factorial", bestScore: 100, attempts: 3 }],
    weakAreas: [{ topic: "BV", avgScore: 50 }],
    strongAreas: [{ topic: "EC", avgScore: 95 }],
    skillGaps: [{ topic: "Boundary", gap: 30 }],
    difficultyBreakdown: {
      easy: { count: 5, avgScore: 90 },
      medium: { count: 3, avgScore: 70 },
      hard: { count: 2, avgScore: 50 },
    },
  };

  it("accepts valid analytics response", () => {
    const result = studentAnalyticsResponseSchema.safeParse(validAnalytics);
    expect(result.success).toBe(true);
  });

  it("rejects negative attempts", () => {
    const result = studentAnalyticsResponseSchema.safeParse({
      ...validAnalytics,
      attempts: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty arrays", () => {
    const result = studentAnalyticsResponseSchema.safeParse({
      ...validAnalytics,
      scoresOverTime: [],
      topicMastery: [],
      taskBreakdown: [],
      weakAreas: [],
      strongAreas: [],
      skillGaps: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing difficulty breakdown", () => {
    const { difficultyBreakdown: _, ...rest } = validAnalytics;
    const result = studentAnalyticsResponseSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("leaderboardResponseSchema", () => {
  const validLeaderboard = {
    leaderboard: [
      { userId: "u1", name: "Alice", totalScore: 950, rank: 1, attempts: 10, avgScore: 95 },
    ],
    totalParticipants: 1,
    currentUser: { userId: "u1", rank: 1, totalScore: 950 },
    period: "all",
    page: 1,
    totalPages: 1,
  };

  it("accepts valid leaderboard response", () => {
    const result = leaderboardResponseSchema.safeParse(validLeaderboard);
    expect(result.success).toBe(true);
  });

  it("accepts null currentUser", () => {
    const result = leaderboardResponseSchema.safeParse({
      ...validLeaderboard,
      currentUser: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional groupId", () => {
    const result = leaderboardResponseSchema.safeParse({
      ...validLeaderboard,
      groupId: "group-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative totalParticipants", () => {
    const result = leaderboardResponseSchema.safeParse({
      ...validLeaderboard,
      totalParticipants: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects page zero", () => {
    const result = leaderboardResponseSchema.safeParse({
      ...validLeaderboard,
      page: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty leaderboard", () => {
    const result = leaderboardResponseSchema.safeParse({
      ...validLeaderboard,
      leaderboard: [],
    });
    expect(result.success).toBe(true);
  });
});
