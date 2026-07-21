import type { TestCase } from "./evaluator";

const PROGRESS_KEY = "test-trainer-progress";
const SESSION_PREFIX = "test-trainer-session-";
const HISTORY_KEY = "test-trainer-history";
const STREAK_KEY = "test-trainer-streak";
const NOTE_PREFIX = "test-trainer-note-";
const GLOBAL_NOTES_KEY = "test-trainer-global-notes";

const MAX_HISTORY_ENTRIES = 50;
const MAX_MARATHON_RECORDS = 20;

function isClient(): boolean {
  return typeof window !== "undefined";
}

/**
 * Save global notes
 */
export function saveGlobalNotes(content: string): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(GLOBAL_NOTES_KEY, content);
  } catch {
    // ignore
  }
}

/**
 * Load global notes
 */
export function loadGlobalNotes(): string {
  if (!isClient()) return "";
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
 * Save best score for a task
 */
export function saveProgress(
  taskId: number,
  score: number,
  testCases: TestCase[]
): void {
  if (!isClient()) return;
  try {
    const progress = loadProgress();
    const existing = progress[String(taskId)];
    // Only save if the score is better
    if (!existing || score >= existing.score) {
      progress[String(taskId)] = { score, testCases };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    }
  } catch {
    // localStorage unavailable
  }
}

/**
 * Load all saved progress
 */
export function loadProgress(): Record<string, TaskProgress> {
  if (!isClient()) return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Save current working session for a task
 */
export function saveCurrentSession(
  taskId: number,
  testCases: TestCase[]
): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(
      SESSION_PREFIX + taskId,
      JSON.stringify(testCases)
    );
  } catch {
    // localStorage unavailable
  }
}

/**
 * Load saved session for a task
 */
export function loadCurrentSession(taskId: number): TestCase[] | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(SESSION_PREFIX + taskId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Export all progress as JSON string
 */
export function exportAllProgress(): string {
  if (!isClient()) return "{}";
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
 * Import progress from JSON string
 */
export function importAllProgress(jsonString: string): boolean {
  if (!isClient()) return false;
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
 * Clear all progress
 */
export function clearAllProgress(): void {
  if (!isClient()) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("test-trainer-")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
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
 * Save an attempt to history
 */
export function saveAttempt(record: AttemptRecord): void {
  if (!isClient()) return;
  try {
    const history = loadAttemptHistory();
    history.push(record);
    // Keep last MAX_HISTORY_ENTRIES attempts
    if (history.length > MAX_HISTORY_ENTRIES) history.splice(0, history.length - MAX_HISTORY_ENTRIES);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

/**
 * Load attempt history
 */
export function loadAttemptHistory(): AttemptRecord[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Get history for a specific task
 */
export function getTaskHistory(taskId: number): AttemptRecord[] {
  return loadAttemptHistory().filter((r) => r.taskId === taskId);
}

/**
 * Get best EC and BV coverage for a specific task from history
 */
export function getTaskBestCoverage(taskId: number): { bestEc: number; bestBv: number } {
  const history = getTaskHistory(taskId);
  if (history.length === 0) return { bestEc: 0, bestBv: 0 };
  const bestEc = history.reduce((max, h) => Math.max(max, h.ecCoverage ?? 0), 0);
  const bestBv = history.reduce((max, h) => Math.max(max, h.bvCoverage ?? 0), 0);
  return { bestEc, bestBv };
}

/**
 * Save a note for a task
 */
export function saveTaskNote(taskId: number, note: string): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(NOTE_PREFIX + taskId, note);
  } catch {
    // localStorage unavailable
  }
}

/**
 * Load a note for a task
 */
export function loadTaskNote(taskId: number): string {
  if (!isClient()) return "";
  try {
    return localStorage.getItem(NOTE_PREFIX + taskId) || "";
  } catch {
    return "";
  }
}

/**
 * Helper: get today's date as YYYY-MM-DD string (local time)
 */
function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Helper: get date string for N days ago (local time)
 */
function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Module-level lock to prevent concurrent streak writes (race condition guard)
let streakSaveLock: Promise<StreakData> | null = null;

/**
 * Reset the streak save lock (for testing purposes only)
 */
export function _resetStreakSaveLock(): void {
  streakSaveLock = null;
}

/**
 * Save streak data. Call this after each successful attempt.
 * Uses a lock to prevent race conditions from rapid concurrent submissions.
 */
export async function saveStreak(): Promise<StreakData> {
  if (!isClient()) return { currentStreak: 0, longestStreak: 0, lastActiveDate: "" };
  // If a save is already in progress, queue behind it and retry after
  if (streakSaveLock) {
    const existingLock = streakSaveLock;
    return new Promise<StreakData>((resolve) => {
      existingLock.then(() => {
        resolve(saveStreak());
      });
    });
  }

  streakSaveLock = (async () => {
    try {
      const streak = loadStreak();
      const today = getTodayDate();

      if (streak.lastActiveDate === today) {
        return streak;
      }

      if (streak.lastActiveDate === getDateDaysAgo(1)) {
        streak.currentStreak += 1;
      } else if (streak.lastActiveDate !== today) {
        streak.currentStreak = 1;
      }

      streak.lastActiveDate = today;
      streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
      localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
      return streak;
    } catch {
      return { currentStreak: 0, longestStreak: 0, lastActiveDate: "" };
    } finally {
      // Clear the lock only after this save completes, so queued callers
      // see a null lock and acquire it themselves in their retry.
      // This must happen in finally (not after .then) to avoid the race
      // where the lock is cleared before queued callers can acquire it.
      streakSaveLock = null;
    }
  })();

  return streakSaveLock;
}

/**
 * Load streak data from localStorage
 */
export function loadStreak(): StreakData {
  if (!isClient()) return { currentStreak: 0, longestStreak: 0, lastActiveDate: "" };
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { currentStreak: 0, longestStreak: 0, lastActiveDate: "" };
    return JSON.parse(raw);
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
  if (!isClient()) return;
  try {
    const records = loadMarathonRecords();
    records.push(record);
    // Keep last MAX_MARATHON_RECORDS marathon records
    if (records.length > MAX_MARATHON_RECORDS) records.splice(0, records.length - MAX_MARATHON_RECORDS);
    localStorage.setItem(MARATHON_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

/**
 * Load all marathon records
 */
export function loadMarathonRecords(): MarathonRecord[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(MARATHON_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
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
  if (!isClient()) return;
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
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(THEORY_VIEWED_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
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
  if (!isClient()) return;
  try {
    localStorage.removeItem(THEORY_VIEWED_KEY);
  } catch {
    // ignore
  }
}

