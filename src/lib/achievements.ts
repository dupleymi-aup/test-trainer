"use client";

import { logger } from "./logger";

export interface Achievement {
  id: string;
  nameKey: string; // i18n key for display name
  descriptionKey: string; // i18n key for description
  icon: string; // emoji
  condition: (context: AchievementContext) => boolean;
  progressFn?: (context: AchievementContext) => number; // 0-1 progress for locked achievements
}

export interface AchievementContext {
  completedTasks: number;
  totalTasks: number;
  bestScores: Record<number, number>;
  totalAttempts: number;
  perfectScores: number; // count of tasks with 100%
  attemptHistory: { taskId: number; score: number; timestamp: number }[];
  maxBvCoverage?: number; // highest boundary value coverage % from any single submission
  examsCompleted?: number; // number of exams completed
  maxEcCoverage?: number; // highest equivalence class coverage % from any single submission
  examAvgScore?: number; // average score across completed exams
  usedAllCategories?: boolean; // whether student has used all 4 test case categories in one submission
  theorySectionsRead?: number; // number of theory sections viewed
  scoreImprovements?: number; // count of times student improved their score on a task
  daysActive?: number; // number of distinct days with activity
  marathonCompleted?: number; // number of marathons completed (all tasks finished)
  bestMarathonScore?: number; // best average score in a completed marathon
  exceptionTestTasks?: number; // count of distinct tasks where exception/invalid type tests were submitted
  workedExamplesViewed?: number; // number of worked examples viewed
  testCaseCategories?: Set<string>; // distinct test case categories used across submissions
}

const ACHIEVEMENTS_KEY = "test-trainer-achievements";

export const achievements: Achievement[] = [
  {
    id: "first_blood",
    nameKey: "first_blood_name",
    descriptionKey: "first_blood_desc",
    icon: "🎯",
    condition: (ctx) => ctx.totalAttempts >= 1,
    progressFn: (ctx) => Math.min(ctx.totalAttempts, 1),
  },
  {
    id: "first_perfect",
    nameKey: "first_perfect_name",
    descriptionKey: "first_perfect_desc",
    icon: "💯",
    condition: (ctx) => ctx.perfectScores >= 1,
    progressFn: (ctx) => Math.min(ctx.perfectScores, 1),
  },
  {
    id: "half_done",
    nameKey: "half_done_name",
    descriptionKey: "half_done_desc",
    icon: "⭐",
    condition: (ctx) => ctx.completedTasks >= Math.ceil(ctx.totalTasks / 2),
    progressFn: (ctx) => ctx.totalTasks > 0 ? ctx.completedTasks / Math.ceil(ctx.totalTasks / 2) : 0,
  },
  {
    id: "all_done",
    nameKey: "all_done_name",
    descriptionKey: "all_done_desc",
    icon: "🏆",
    condition: (ctx) => ctx.completedTasks >= ctx.totalTasks,
    progressFn: (ctx) => ctx.totalTasks > 0 ? ctx.completedTasks / ctx.totalTasks : 0,
  },
  {
    id: "all_perfect",
    nameKey: "all_perfect_name",
    descriptionKey: "all_perfect_desc",
    icon: "👑",
    condition: (ctx) => ctx.perfectScores >= ctx.totalTasks,
    progressFn: (ctx) => ctx.totalTasks > 0 ? ctx.perfectScores / ctx.totalTasks : 0,
  },
  {
    id: "persistent",
    nameKey: "persistent_name",
    descriptionKey: "persistent_desc",
    icon: "🔥",
    condition: (ctx) => ctx.totalAttempts >= 10,
    progressFn: (ctx) => Math.min(ctx.totalAttempts / 10, 1),
  },
  {
    id: "explorer",
    nameKey: "explorer_name",
    descriptionKey: "explorer_desc",
    icon: "🧭",
    condition: (ctx) => Object.keys(ctx.bestScores).length >= ctx.totalTasks,
    progressFn: (ctx) => ctx.totalTasks > 0 ? Object.keys(ctx.bestScores).length / ctx.totalTasks : 0,
  },
  {
    id: "good_student",
    nameKey: "good_student_name",
    descriptionKey: "good_student_desc",
    icon: "📚",
    condition: (ctx) => Object.values(ctx.bestScores).filter((s) => s >= 90).length >= 3,
    progressFn: (ctx) => Math.min(Object.values(ctx.bestScores).filter((s) => s >= 90).length / 3, 1),
  },
  {
    id: "exam_passer",
    nameKey: "exam_passer_name",
    descriptionKey: "exam_passer_desc",
    icon: "📝",
    condition: (ctx) => (ctx.examsCompleted ?? 0) >= 1,
    progressFn: (ctx) => Math.min(ctx.examsCompleted ?? 0, 1),
  },
  {
    id: "boundary_hunter",
    nameKey: "boundary_hunter_name",
    descriptionKey: "boundary_hunter_desc",
    icon: "🔍",
    condition: (ctx) => (ctx.maxBvCoverage ?? 0) >= 100,
    progressFn: (ctx) => (ctx.maxBvCoverage ?? 0) / 100,
  },
  {
    id: "speed_demon",
    nameKey: "speed_demon_name",
    descriptionKey: "speed_demon_desc",
    icon: "⚡",
    condition: (ctx) => (ctx.examAvgScore ?? 0) >= 80,
    progressFn: (ctx) => Math.min((ctx.examAvgScore ?? 0) / 80, 1),
  },
  {
    id: "completer",
    nameKey: "completer_name",
    descriptionKey: "completer_desc",
    icon: "✅",
    condition: (ctx) => (ctx.maxEcCoverage ?? 0) >= 100,
    progressFn: (ctx) => (ctx.maxEcCoverage ?? 0) / 100,
  },
  {
    id: "diverse_tester",
    nameKey: "diverse_tester_name",
    descriptionKey: "diverse_tester_desc",
    icon: "🎨",
    condition: (ctx) => ctx.usedAllCategories === true,
    progressFn: (ctx) => {
      if (ctx.usedAllCategories) return 1;
      const cats = ctx.testCaseCategories ?? new Set();
      return Math.min(cats.size / 4, 0.75);
    },
  },
  {
    id: "theory_explorer",
    nameKey: "theory_explorer_name",
    descriptionKey: "theory_explorer_desc",
    icon: "📖",
    condition: (ctx) => (ctx.theorySectionsRead ?? 0) >= 5,
    progressFn: (ctx) => Math.min((ctx.theorySectionsRead ?? 0) / 5, 1),
  },
  {
    id: "self_corrector",
    nameKey: "self_corrector_name",
    descriptionKey: "self_corrector_desc",
    icon: "🔄",
    condition: (ctx) => (ctx.scoreImprovements ?? 0) >= 1,
  },
  {
    id: "consistent_learner",
    nameKey: "consistent_learner_name",
    descriptionKey: "consistent_learner_desc",
    icon: "📅",
    condition: (ctx) => (ctx.daysActive ?? 0) >= 5,
  },
  {
    id: "error_guesser",
    nameKey: "error_guesser_name",
    descriptionKey: "error_guesser_desc",
    icon: "🔮",
    condition: (ctx) => (ctx.exceptionTestTasks ?? 0) >= 3,
    progressFn: (ctx) => Math.min((ctx.exceptionTestTasks ?? 0) / 3, 1),
  },
  {
    id: "comeback",
    nameKey: "comeback_name",
    descriptionKey: "comeback_desc",
    icon: "💪",
    condition: (ctx) => (ctx.scoreImprovements ?? 0) >= 2,
    progressFn: (ctx) => Math.min((ctx.scoreImprovements ?? 0) / 2, 1),
  },
  {
    id: "marathon_finisher",
    nameKey: "marathon_finisher_name",
    descriptionKey: "marathon_finisher_desc",
    icon: "🏃",
    condition: (ctx) => (ctx.marathonCompleted ?? 0) >= 1,
    progressFn: (ctx) => Math.min(ctx.marathonCompleted ?? 0, 1),
  },
  {
    id: "marathon_champion",
    nameKey: "marathon_champion_name",
    descriptionKey: "marathon_champion_desc",
    icon: "🥇",
    condition: (ctx) => (ctx.bestMarathonScore ?? 0) >= 90,
    progressFn: (ctx) => Math.min((ctx.bestMarathonScore ?? 0) / 90, 1),
  },
  {
    id: "exam_expert",
    nameKey: "exam_expert_name",
    descriptionKey: "exam_expert_desc",
    icon: "🎓",
    condition: (ctx) => (ctx.examsCompleted ?? 0) >= 3,
    progressFn: (ctx) => Math.min((ctx.examsCompleted ?? 0) / 3, 1),
  },
  {
    id: "exam_perfect",
    nameKey: "exam_perfect_name",
    descriptionKey: "exam_perfect_desc",
    icon: "💎",
    condition: (ctx) => (ctx.examAvgScore ?? 0) >= 95,
    progressFn: (ctx) => Math.min((ctx.examAvgScore ?? 0) / 95, 1),
  },
  {
    id: "example_scholar",
    nameKey: "example_scholar_name",
    descriptionKey: "example_scholar_desc",
    icon: "📖",
    condition: (ctx) => (ctx.workedExamplesViewed ?? 0) >= 17,
    progressFn: (ctx) => Math.min((ctx.workedExamplesViewed ?? 0) / 17, 1),
  },
];

export function loadUnlockedAchievements(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    logger.warn("Failed to load achievements from localStorage", { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

export function saveUnlockedAchievements(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(ids));
  } catch (e) {
    logger.warn("Failed to save achievements to localStorage", { error: e instanceof Error ? e.message : String(e) });
  }
}

export function checkAndUnlockAchievements(context: AchievementContext): string[] {
  const previouslyUnlocked = loadUnlockedAchievements();
  const newlyUnlocked: string[] = [];

  for (const achievement of achievements) {
    if (!previouslyUnlocked.includes(achievement.id) && achievement.condition(context)) {
      newlyUnlocked.push(achievement.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    const allUnlocked = [...previouslyUnlocked, ...newlyUnlocked];
    saveUnlockedAchievements(allUnlocked);
  }

  return newlyUnlocked;
}
