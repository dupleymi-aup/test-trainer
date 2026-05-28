import type { TestCase } from "./evaluator";

const PROGRESS_KEY = "test-trainer-progress";
const SESSION_PREFIX = "test-trainer-session-";
const HISTORY_KEY = "test-trainer-history";
const STREAK_KEY = "test-trainer-streak";
const NOTE_PREFIX = "test-trainer-note-";
const GLOBAL_NOTES_KEY = "test-trainer-global-notes";

/**
 * Сохраняет глобальные заметки
 */
export function saveGlobalNotes(content: string): void {
  try {
    localStorage.setItem(GLOBAL_NOTES_KEY, content);
  } catch {
    // ignore
  }
}

/**
 * Загружает глобальные заметки
 */
export function loadGlobalNotes(): string {
  try {
    return localStorage.getItem(GLOBAL_NOTES_KEY) ?? "";
  } catch {
    return "";
  }
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
}

export interface TaskProgress {
  score: number;
  testCases: TestCase[];
}

/**
 * Сохраняет лучший результат для задачи
 */
export function saveProgress(
  taskId: number,
  score: number,
  testCases: TestCase[]
): void {
  try {
    const progress = loadProgress();
    const existing = progress[String(taskId)];
    // Сохраняем только если результат лучше
    if (!existing || score >= existing.score) {
      progress[String(taskId)] = { score, testCases };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    }
  } catch {
    // localStorage недоступен
  }
}

/**
 * Загружает все сохранённые результаты
 */
export function loadProgress(): Record<string, TaskProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

/**
 * Сохраняет текущую сессию работы над задачей
 */
export function saveCurrentSession(
  taskId: number,
  testCases: TestCase[]
): void {
  try {
    localStorage.setItem(
      SESSION_PREFIX + taskId,
      JSON.stringify(testCases)
    );
  } catch {
    // localStorage недоступен
  }
}

/**
 * Загружает сохранённую сессию для задачи
 */
export function loadCurrentSession(taskId: number): TestCase[] | null {
  try {
    const raw = localStorage.getItem(SESSION_PREFIX + taskId);
    if (!raw) return null;
    return JSON.parse(raw || "[]");
  } catch {
    return null;
  }
}

/**
 * Экспортирует весь прогресс как JSON-строку
 */
export function exportAllProgress(): string {
  try {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("test-trainer-")) {
        data[key] = localStorage.getItem(key) || "";
      }
    }
    return JSON.stringify(data, null, 2);
  } catch {
    return "{}";
  }
}

/**
 * Импортирует прогресс из JSON-строки
 */
export function importAllProgress(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (typeof data !== "object" || data === null) return false;

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("test-trainer-")) {
        localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Полностью очищает весь прогресс
 */
export function clearAllProgress(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("test-trainer-")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    clearTheoryProgress();
    clearMarathonProgress();
  } catch {
    // ignore
  }
}

export interface AttemptRecord {
  taskId: number;
  score: number;
  ecCoverage: number;
  bvCoverage: number;
  correctnessScore: number;
  timestamp: number;
  testCasesCount: number;
  coveredEcIds?: string[];
  coveredBvDescriptions?: string[];
  timeSpentMs?: number; // time from first test case addition to submission
  categoryDistribution?: Record<string, number>; // count of test cases per category
}

/**
 * Сохраняет попытку в историю
 */
export function saveAttempt(record: AttemptRecord): void {
  try {
    const history = loadAttemptHistory();
    history.push(record);
    // Keep last 50 attempts
    if (history.length > 50) history.splice(0, history.length - 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

/**
 * Загружает историю попыток
 */
export function loadAttemptHistory(): AttemptRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

/**
 * Получает историю для конкретного задания
 */
export function getTaskHistory(taskId: number): AttemptRecord[] {
  return loadAttemptHistory().filter((r) => r.taskId === taskId);
}

/**
 * Получает лучшие покрытия EC и BV для конкретного задания из истории
 */
export function getTaskBestCoverage(taskId: number): { bestEc: number; bestBv: number } {
  const history = getTaskHistory(taskId);
  if (history.length === 0) return { bestEc: 0, bestBv: 0 };
  const bestEc = history.reduce((max, h) => Math.max(max, h.ecCoverage ?? 0), 0);
  const bestBv = history.reduce((max, h) => Math.max(max, h.bvCoverage ?? 0), 0);
  return { bestEc, bestBv };
}

/**
 * Сохраняет заметку для задания
 */
export function saveTaskNote(taskId: number, note: string): void {
  try {
    localStorage.setItem(NOTE_PREFIX + taskId, note);
  } catch {
    // localStorage недоступен
  }
}

/**
 * Загружает заметку для задания
 */
export function loadTaskNote(taskId: number): string {
  try {
    return localStorage.getItem(NOTE_PREFIX + taskId) || "";
  } catch {
    return "";
  }
}

/**
 * Helper: get today's date as YYYY-MM-DD string (UTC)
 */
function getTodayDate(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Helper: get date string for N days ago (UTC)
 */
function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Module-level lock to prevent concurrent streak writes (race condition guard)
let streakSaveLock: Promise<StreakData> | null = null;

/**
 * Save streak data. Call this after each successful attempt.
 * Uses a lock to prevent race conditions from rapid concurrent submissions.
 */
export async function saveStreak(): Promise<StreakData> {
  // If a save is in progress, wait for it to complete first
  if (streakSaveLock) {
    await streakSaveLock;
  }

  const promise = (async () => {
    try {
      const streak = loadStreak();
      const today = getTodayDate();

      if (streak.lastActiveDate === today) {
        // Already active today, no change
        return streak;
      }

      if (streak.lastActiveDate === getDateDaysAgo(1)) {
        // Yesterday was active — continue streak
        streak.currentStreak += 1;
      } else if (streak.lastActiveDate !== today) {
        // Streak broken (unless today is already recorded)
        streak.currentStreak = 1;
      }

      streak.lastActiveDate = today;
      streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
      localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
      return streak;
    } catch {
      return { currentStreak: 0, longestStreak: 0, lastActiveDate: "" };
    } finally {
      streakSaveLock = null;
    }
  })();

  streakSaveLock = promise;
  return promise;
}

/**
 * Load streak data from localStorage
 */
export function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { currentStreak: 0, longestStreak: 0, lastActiveDate: "" };
    return JSON.parse(raw || "{}");
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: "" };
  }
}

const THEORY_VIEWED_KEY = "test-trainer-theory-viewed";
const MARATHON_KEY = "test-trainer-marathons";

export interface MarathonRecord {
  timestamp: number;
  totalTasks: number;
  completedTasks: number;
  avgScore: number;
  totalTimeSec: number;
}

/**
 * Save a marathon completion record
 */
export function saveMarathonRecord(record: MarathonRecord): void {
  try {
    const records = loadMarathonRecords();
    records.push(record);
    // Keep last 20 marathon records
    if (records.length > 20) records.splice(0, records.length - 20);
    localStorage.setItem(MARATHON_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

/**
 * Load all marathon records
 */
export function loadMarathonRecords(): MarathonRecord[] {
  try {
    const raw = localStorage.getItem(MARATHON_KEY);
    if (!raw) return [];
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

/**
 * Get total number of completed marathons
 */
export function getMarathonsCompleted(): number {
  return loadMarathonRecords().filter((r) => r.completedTasks === r.totalTasks).length;
}

/**
 * Get best average score across all completed marathons
 */
export function getBestMarathonAvgScore(): number {
  const completed = loadMarathonRecords().filter((r) => r.completedTasks === r.totalTasks);
  if (completed.length === 0) return 0;
  return completed.reduce((max, r) => Math.max(max, r.avgScore), 0);
}

/**
 * Mark a theory section as viewed
 */
export function markTheorySectionViewed(sectionId: string): void {
  try {
    const viewed = loadTheorySectionsViewed();
    if (!viewed.includes(sectionId)) {
      viewed.push(sectionId);
      localStorage.setItem(THEORY_VIEWED_KEY, JSON.stringify(viewed));
    }
  } catch {
    // ignore
  }
}

/**
 * Load viewed theory section IDs
 */
export function loadTheorySectionsViewed(): string[] {
  try {
    const raw = localStorage.getItem(THEORY_VIEWED_KEY);
    if (!raw) return [];
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

/**
 * Check if a specific theory section has been viewed
 */
export function isTheorySectionViewed(sectionId: string): boolean {
  return loadTheorySectionsViewed().includes(sectionId);
}

/**
 * Reset theory progress (called by clearAllProgress)
 */
export function clearTheoryProgress(): void {
  try {
    localStorage.removeItem(THEORY_VIEWED_KEY);
  } catch {
    // ignore
  }
}

/**
 * Reset marathon progress
 */
export function clearMarathonProgress(): void {
  try {
    localStorage.removeItem(MARATHON_KEY);
  } catch {
    // ignore
  }
}
