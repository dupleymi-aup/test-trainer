import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.string(),
  version: z.string(),
  uptime: z.number(),
  timestamp: z.string(),
  database: z.any(),
  mongodb: z.any(),
  memory: z.any(),
});

export const studentAnalyticsResponseSchema = z.object({
  attempts: z.number(),
  scoresOverTime: z.array(z.any()),
  topicMastery: z.array(z.any()),
  taskBreakdown: z.array(z.any()),
  weakAreas: z.array(z.any()),
  strongAreas: z.array(z.any()),
  skillGaps: z.array(z.any()),
  difficultyBreakdown: z.array(z.any()),
});

export const leaderboardResponseSchema = z.object({
  leaderboard: z.array(z.any()),
  totalParticipants: z.number(),
  currentUser: z.any().nullable(),
  period: z.string(),
  page: z.number(),
  totalPages: z.number(),
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
