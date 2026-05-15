"use client";

export interface Achievement {
  id: string;
  name: string;
  description: string;
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
}

const ACHIEVEMENTS_KEY = "test-trainer-achievements";

export const achievements: Achievement[] = [
  {
    id: "first_blood",
    name: "Первый тест",
    description: "Отправьте первую проверку тест-кейсов",
    icon: "🎯",
    condition: (ctx) => ctx.totalAttempts >= 1,
    progressFn: (ctx) => Math.min(ctx.totalAttempts, 1),
  },
  {
    id: "first_perfect",
    name: "Безупречно",
    description: "Получите оценку 100% по любому заданию",
    icon: "💯",
    condition: (ctx) => ctx.perfectScores >= 1,
    progressFn: (ctx) => Math.min(ctx.perfectScores, 1),
  },
  {
    id: "half_done",
    name: "Наполовину",
    description: "Выполните половину заданий",
    icon: "⭐",
    condition: (ctx) => ctx.completedTasks >= Math.ceil(ctx.totalTasks / 2),
    progressFn: (ctx) => ctx.totalTasks > 0 ? ctx.completedTasks / Math.ceil(ctx.totalTasks / 2) : 0,
  },
  {
    id: "all_done",
    name: "Мастер тестирования",
    description: "Выполните все задания",
    icon: "🏆",
    condition: (ctx) => ctx.completedTasks >= ctx.totalTasks,
    progressFn: (ctx) => ctx.totalTasks > 0 ? ctx.completedTasks / ctx.totalTasks : 0,
  },
  {
    id: "all_perfect",
    name: "Перфекционист",
    description: "Получите 100% по всем заданиям",
    icon: "👑",
    condition: (ctx) => ctx.perfectScores >= ctx.totalTasks,
    progressFn: (ctx) => ctx.totalTasks > 0 ? ctx.perfectScores / ctx.totalTasks : 0,
  },
  {
    id: "persistent",
    name: "Настойчивый",
    description: "Выполните 10 проверок",
    icon: "🔥",
    condition: (ctx) => ctx.totalAttempts >= 10,
    progressFn: (ctx) => Math.min(ctx.totalAttempts / 10, 1),
  },
  {
    id: "explorer",
    name: "Исследователь",
    description: "Попробуйте все задания хотя бы раз",
    icon: "🧭",
    condition: (ctx) => Object.keys(ctx.bestScores).length >= ctx.totalTasks,
    progressFn: (ctx) => ctx.totalTasks > 0 ? Object.keys(ctx.bestScores).length / ctx.totalTasks : 0,
  },
  {
    id: "good_student",
    name: "Отличник",
    description: "Получите оценку ≥90% по 3 заданиям",
    icon: "📚",
    condition: (ctx) => Object.values(ctx.bestScores).filter((s) => s >= 90).length >= 3,
    progressFn: (ctx) => Math.min(Object.values(ctx.bestScores).filter((s) => s >= 90).length / 3, 1),
  },
  {
    id: "exam_passer",
    name: "Экзаменатор",
    description: "Завершите экзамен хотя бы раз",
    icon: "📝",
    condition: (ctx) => (ctx.examsCompleted ?? 0) >= 1,
    progressFn: (ctx) => Math.min(ctx.examsCompleted ?? 0, 1),
  },
  {
    id: "boundary_hunter",
    name: "Охотник за границами",
    description: "Покройте все граничные значения в одном задании",
    icon: "🔍",
    condition: (ctx) => (ctx.maxBvCoverage ?? 0) >= 100,
    progressFn: (ctx) => (ctx.maxBvCoverage ?? 0) / 100,
  },
  {
    id: "speed_demon",
    name: "Скоростной",
    description: "Завершите экзамен, получив среднюю оценку ≥80%",
    icon: "⚡",
    condition: (ctx) => (ctx.examAvgScore ?? 0) >= 80,
    progressFn: (ctx) => Math.min((ctx.examAvgScore ?? 0) / 80, 1),
  },
  {
    id: "completer",
    name: "Завершающий",
    description: "Покройте 100% классов эквивалентности в задании",
    icon: "✅",
    condition: (ctx) => (ctx.maxEcCoverage ?? 0) >= 100,
    progressFn: (ctx) => (ctx.maxEcCoverage ?? 0) / 100,
  },
  {
    id: "diverse_tester",
    name: "Разносторонний тестировщик",
    description: "Используйте все 4 категории тест-кейсов в одной проверке",
    icon: "🎨",
    condition: (ctx) => ctx.usedAllCategories === true,
  },
  {
    id: "theory_explorer",
    name: "Теоретик",
    description: "Изучите 5 разделов теории",
    icon: "📖",
    condition: (ctx) => (ctx.theorySectionsRead ?? 0) >= 5,
  },
  {
    id: "self_corrector",
    name: "Самокоррекция",
    description: "Улучшите оценку на том же задании минимум на 20%",
    icon: "🔄",
    condition: (ctx) => (ctx.scoreImprovements ?? 0) >= 1,
  },
  {
    id: "consistent_learner",
    name: "Стабильный ученик",
    description: "Занимайтесь 5 разных дней",
    icon: "📅",
    condition: (ctx) => (ctx.daysActive ?? 0) >= 5,
  },
  {
    id: "error_guesser",
    name: "Интуитивный тестировщик",
    description: "Добавьте тест-кейсы для исключений и недопустимых типов в 3 заданиях",
    icon: "🔮",
    condition: (ctx) => Object.values(ctx.bestScores).filter((s) => s >= 50).length >= 3,
  },
  {
    id: "comeback",
    name: "Камбэк",
    description: "После результата <50% получите ≥90% на том же задании",
    icon: "💪",
    condition: (ctx) => (ctx.scoreImprovements ?? 0) >= 2,
  },
  {
    id: "marathon_finisher",
    name: "Марафонец",
    description: "Завершите марафон (пройдите все задания подряд)",
    icon: "🏃",
    condition: (ctx) => (ctx.marathonCompleted ?? 0) >= 1,
    progressFn: (ctx) => Math.min(ctx.marathonCompleted ?? 0, 1),
  },
  {
    id: "marathon_champion",
    name: "Чемпион марафона",
    description: "Завершите марафон со средним баллом ≥90%",
    icon: "🥇",
    condition: (ctx) => (ctx.bestMarathonScore ?? 0) >= 90,
    progressFn: (ctx) => Math.min((ctx.bestMarathonScore ?? 0) / 90, 1),
  },
  {
    id: "exam_expert",
    name: "Эксперт экзамена",
    description: "Завершите 3 экзамена",
    icon: "🎓",
    condition: (ctx) => (ctx.examsCompleted ?? 0) >= 3,
    progressFn: (ctx) => Math.min((ctx.examsCompleted ?? 0) / 3, 1),
  },
  {
    id: "exam_perfect",
    name: "Безупречный экзамен",
    description: "Получите средний балл ≥95% на экзамене",
    icon: "💎",
    condition: (ctx) => (ctx.examAvgScore ?? 0) >= 95,
    progressFn: (ctx) => Math.min((ctx.examAvgScore ?? 0) / 95, 1),
  },
];

export function loadUnlockedAchievements(): string[] {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUnlockedAchievements(ids: string[]): void {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
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
