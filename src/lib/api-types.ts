import { z } from "zod";

export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    totalPages: z.number().int(),
    limit: z.number().int(),
  });

export const statsResponseSchema = z.object({
  userCount: z.number().int(),
  attemptCount: z.number().int(),
  groupCount: z.number().int(),
});

export const healthResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  version: z.string(),
  uptime: z.number().int(),
  timestamp: z.string().datetime(),
  database: z.object({
    ok: z.boolean(),
    type: z.enum(["sqlite", "postgres", "mongodb"]),
    details: z.string(),
  }),
  mongodb: z.object({
    ok: z.boolean(),
    details: z.string(),
  }).optional(),
  memory: z.object({
    rss: z.number(),
    heapTotal: z.number(),
    heapUsed: z.number(),
    external: z.number(),
    arrayBuffers: z.number(),
  }),
});

export const leaderboardEntrySchema = z.object({
  rank: z.number().int(),
  userId: z.string(),
  name: z.string(),
  avgScore: z.number().int(),
  bestScore: z.number().int(),
  totalAttempts: z.number().int(),
  totalTasks: z.number().int(),
  avgTime: z.number().int(),
});

export const leaderboardResponseSchema = z.object({
  leaderboard: z.array(leaderboardEntrySchema),
  totalParticipants: z.number().int(),
  currentUser: z.object({
    rank: z.number().int(),
    stats: z.object({
      userId: z.string(),
      name: z.string(),
      avgScore: z.number().int(),
      bestScore: z.number().int(),
      totalAttempts: z.number().int(),
      totalTasks: z.number().int(),
      avgTime: z.number().int(),
    }),
  }).nullable(),
  period: z.enum(["all", "week", "month"]),
  page: z.number().int(),
  totalPages: z.number().int(),
  groupId: z.string().nullable(),
});

export const analyticsScorePointSchema = z.object({
  date: z.string(),
  score: z.number(),
  ecCoverage: z.number(),
  bvCoverage: z.number(),
});

export const topicMasterySchema = z.object({
  topic: z.string(),
  avgScore: z.number().int(),
  bestScore: z.number().int(),
  attemptsCount: z.number().int(),
});

export const difficultyBreakdownSchema = z.object({
  difficulty: z.string(),
  completed: z.number().int(),
  total: z.number().int(),
  percent: z.number().int(),
});

export const studentAnalyticsResponseSchema = z.object({
  attempts: z.number().int(),
  scoresOverTime: z.array(analyticsScorePointSchema),
  topicMastery: z.array(topicMasterySchema),
  taskBreakdown: z.array(z.object({
    taskId: z.string(),
    taskName: z.string(),
    difficulty: z.string(),
    scores: z.array(z.number()),
    ec: z.array(z.number()),
    bv: z.array(z.number()),
    bestScore: z.number(),
    avgScore: z.number(),
    avgEc: z.number(),
    avgBv: z.number(),
    attemptsCount: z.number().int(),
  })),
  weakAreas: z.array(topicMasterySchema),
  strongAreas: z.array(topicMasterySchema),
  skillGaps: z.array(topicMasterySchema),
  difficultyBreakdown: z.array(difficultyBreakdownSchema),
});

export const studentHistoryItemSchema = z.object({
  taskId: z.string(),
  taskName: z.string(),
  difficulty: z.string(),
  topics: z.array(z.string()),
  bestScore: z.number(),
  avgScore: z.number(),
  attemptsCount: z.number().int(),
  lastAttempt: z.string().datetime(),
  lastScore: z.number(),
});

export const studentHistoryResponseSchema = z.object({
  history: z.array(studentHistoryItemSchema),
  total: z.number().int(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type StatsResponse = z.infer<typeof statsResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;
export type StudentAnalyticsResponse = z.infer<typeof studentAnalyticsResponseSchema>;
export type StudentHistoryResponse = z.infer<typeof studentHistoryResponseSchema>;
