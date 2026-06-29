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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
}

export interface TaskResponse {
  id: string;
  title: string;
  description: string;
  type: "TEST" | "CODE" | "TEXT";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  maxScore: number;
  timeLimit: number | null;
  createdAt: string;
}

export interface ExamResponse {
  id: string;
  taskId: string;
  score: number;
  maxScore: number;
  completedAt: string;
  timeSpent: number;
}

export interface AchievementResponse {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  progress: number;
  target: number;
}

export interface AnalyticsResponse {
  totalExams: number;
  averageScore: number;
  totalStudyTime: number;
  streak: number;
  weeklyProgress: { date: string; score: number }[];
}

export interface MessageResponse {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  totalScore: number;
  rank: number;
}

export interface GroupResponse {
  id: string;
  name: string;
  description: string | null;
  studentCount: number;
  createdAt: string;
}
