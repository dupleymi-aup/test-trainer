import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  version: z.string(),
  uptime: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  database: z.object({ ok: z.boolean(), details: z.string().optional() }),
  mongodb: z.object({ ok: z.boolean(), details: z.string().optional() }),
  memory: z.object({
    rss: z.number(),
    heapTotal: z.number(),
    heapUsed: z.number(),
    external: z.number(),
  }),
});

const scoreEntrySchema = z.object({
  date: z.string(),
  score: z.number(),
  ecCoverage: z.number(),
  bvCoverage: z.number(),
});

const masteryEntrySchema = z.object({
  topic: z.string(),
  avgScore: z.number(),
  attempts: z.number(),
});

export const studentAnalyticsResponseSchema = z.object({
  attempts: z.number().int().nonnegative(),
  scoresOverTime: z.array(scoreEntrySchema),
  topicMastery: z.array(masteryEntrySchema),
  taskBreakdown: z.array(z.object({
    taskId: z.string(),
    taskName: z.string(),
    bestScore: z.number(),
    attempts: z.number(),
  })),
  weakAreas: z.array(z.object({ topic: z.string(), avgScore: z.number() })),
  strongAreas: z.array(z.object({ topic: z.string(), avgScore: z.number() })),
  skillGaps: z.array(z.object({ topic: z.string(), gap: z.number() })),
  difficultyBreakdown: z.object({
    easy: z.object({ count: z.number(), avgScore: z.number() }),
    medium: z.object({ count: z.number(), avgScore: z.number() }),
    hard: z.object({ count: z.number(), avgScore: z.number() }),
  }),
});

export const leaderboardResponseSchema = z.object({
  leaderboard: z.array(z.object({
    userId: z.string(),
    name: z.string().nullable(),
    totalScore: z.number(),
    rank: z.number(),
    attempts: z.number(),
    avgScore: z.number(),
  })),
  totalParticipants: z.number().int().nonnegative(),
  currentUser: z.object({
    userId: z.string(),
    rank: z.number(),
    totalScore: z.number(),
  }).nullable(),
  period: z.string(),
  page: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  groupId: z.string().nullable().optional(),
});
