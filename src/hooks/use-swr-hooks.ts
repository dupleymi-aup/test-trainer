import useSWR from "swr";
import type { SWRResponse } from "swr";
import { swrFetcher, type FetcherError } from "@/lib/swr-fetcher";

export type { FetcherError };

/**
 * Fetch student analytics data
 */
export function useStudentAnalytics() {
  const swrResult = useSWR<AnalyticsData, FetcherError>(
    "/api/student/analytics",
    (url: string) => swrFetcher<AnalyticsData>(url)
  );

  return wrapSWRResult(swrResult);
}

interface AnalyticsData {
  attempts: number;
  scoresOverTime: Array<{ score: number; createdAt: string }>;
  topicMastery: Array<{ topic: string; avgScore: number }>;
  taskBreakdown: Array<{ taskId: number; attempts: number; bestScore: number }>;
  difficultyBreakdown: Array<{ difficulty: string; total: number; completed: number; percent: number }>;
  weakAreas: string[];
  strongAreas: string[];
}

/**
 * Fetch leaderboard data
 */
export function useLeaderboard(period?: "all" | "week" | "month", limit = 20) {
  const query = new URLSearchParams({
    period: period || "all",
    limit: String(limit),
  });

  const swrResult = useSWR<LeaderboardData, FetcherError>(
    `/api/student/leaderboard?${query}`,
    (url: string) => swrFetcher<LeaderboardData>(url)
  );

  return wrapSWRResult(swrResult);
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  totalScore: number;
  avgScore: number;
  bestScore: number;
  totalAttempts: number;
  totalTasks: number;
  avgTime: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  totalParticipants: number;
  currentUser: { rank: number; stats: LeaderboardEntry } | null;
  period: string;
  page: number;
  totalPages: number;
  groupId: string | null;
}

/**
 * Fetch task history
 */
export function useTaskHistory(taskId?: number) {
  const query = taskId ? `?taskId=${taskId}` : "";

  const swrResult = useSWR<TaskHistoryData, FetcherError>(
    `/api/student/history${query}`,
    (url: string) => swrFetcher<TaskHistoryData>(url)
  );

  return wrapSWRResult(swrResult);
}

interface TaskHistoryData {
  taskHistory: Array<{
    taskId: string;
    taskName: string;
    difficulty: string;
    topics: string[];
    bestScore: number;
    avgScore: number;
    attemptsCount: number;
    lastAttempt: string;
    lastScore: number;
  }>;
}

/**
 * Fetch favorites (revalidates every minute)
 */
export function useFavorites() {
  const swrResult = useSWR<FavoritesData, FetcherError>(
    "/api/student/favorites",
    (url) => swrFetcher<FavoritesData>(url),
    { refreshInterval: 60000 }
  );

  return wrapSWRResult(swrResult);
}

interface FavoritesData {
  favorites: Array<{
    id: string;
    taskId: number;
    createdAt: string;
  }>;
}

/**
 * Fetch learning path (revalidates every 5 minutes)
 */
export function useLearningPath() {
  const swrResult = useSWR<LearningPathData, FetcherError>(
    "/api/student/learning-path",
    (url) => swrFetcher<LearningPathData>(url),
    { refreshInterval: 300000 }
  );

  return wrapSWRResult(swrResult);
}

interface LearningPathData {
  assignments: Array<{
    id: string;
    template: {
      id: string;
      name: string;
      description: string;
      taskIds: string;
      topics: string[];
      estimatedHours: number;
    };
    group: {
      id: string;
      name: string;
    };
  }>;
  progress: Record<string, {
    templateId: string;
    completedTasks: number;
    totalTasks: number;
  }>;
}

/**
 * Helper to wrap SWR result with consistent API
 */
function wrapSWRResult<T, E>(result: SWRResponse<T, E>) {
  return {
    data: result.data,
    error: result.error as E | null,
    isLoading: result.isLoading,
    isValidating: result.isValidating,
    refetch: () => result.mutate(),
    mutate: result.mutate,
  };
}
