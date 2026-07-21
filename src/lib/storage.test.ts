import { describe, it, expect, beforeEach, vi } from "vitest";

// --- localStorage mock (must be hoisted before imports) ---
const store: Record<string, string> = {};

// Vitest runs lib tests under "node" environment (no window).
// Storage functions now guard with typeof window check for SSR safety,
// so we need to define window for the tests to work.
Object.defineProperty(globalThis, "window", {
  value: {} as Window & typeof globalThis,
  configurable: true,
});

const mockLocalStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((index: number) => {
    const keys = Object.keys(store);
    return keys[index] ?? null;
  }),
};

// Set up global localStorage before importing the module
Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  configurable: true,
});

// Import after mock is set up
import {
  saveProgress,
  loadProgress,
  saveCurrentSession,
  loadCurrentSession,
  exportAllProgress,
  importAllProgress,
  clearAllProgress,
  saveAttempt,
  loadAttemptHistory,
  getTaskHistory,
  getTaskBestCoverage,
  saveTaskNote,
  loadTaskNote,
  saveGlobalNotes,
  loadGlobalNotes,
  saveStreak,
  loadStreak,
  _resetStreakSaveLock,
  saveMarathonRecord,
  loadMarathonRecords,
  getMarathonsCompleted,
  getBestMarathonAvgScore,
  markTheorySectionViewed,
  loadTheorySectionsViewed,
  isTheorySectionViewed,
  clearTheoryProgress,
} from "./storage";
import type { TestCase } from "./evaluator";

function makeTestCase(id: string, category: string = "equivalence"): TestCase {
  return {
    id,
    inputs: ["a", "b"],
    expectedOutput: "ab",
    category: category as TestCase["category"],
    comment: "test",
  };
}

describe("storage", () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    _resetStreakSaveLock();
    mockLocalStorage.getItem.mockImplementation((key: string) => store[key] ?? null);
    mockLocalStorage.setItem.mockImplementation((key: string, value: string) => {
      store[key] = value;
    });
    mockLocalStorage.removeItem.mockImplementation((key: string) => {
      delete store[key];
    });
    mockLocalStorage.clear.mockImplementation(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    });
    mockLocalStorage.key.mockImplementation((index: number) => {
      const keys = Object.keys(store);
      return keys[index] ?? null;
    });
  });

  // --- saveProgress / loadProgress ---
  describe("saveProgress / loadProgress", () => {
    it("saves and loads progress for a task", () => {
      const cases = [makeTestCase("1"), makeTestCase("2")];
      saveProgress(1, 80, cases);
      const progress = loadProgress();
      expect(progress["1"]).toEqual({ score: 80, testCases: cases });
    });

    it("only overwrites when new score is >= existing", () => {
      saveProgress(1, 80, [makeTestCase("1")]);
      saveProgress(1, 60, [makeTestCase("2")]); // worse - ignored
      const progress = loadProgress();
      expect(progress["1"].score).toBe(80);
    });

    it("overwrites when new score is equal", () => {
      saveProgress(1, 80, [makeTestCase("1")]);
      const newCases = [makeTestCase("2")];
      saveProgress(1, 80, newCases); // same score - overwrites
      const progress = loadProgress();
      expect(progress["1"].score).toBe(80);
      expect(progress["1"].testCases).toEqual(newCases);
    });

    it("overwrites when new score is better", () => {
      saveProgress(1, 50, [makeTestCase("1")]);
      saveProgress(1, 90, [makeTestCase("2")]);
      const progress = loadProgress();
      expect(progress["1"].score).toBe(90);
    });

    it("returns empty object when no progress saved", () => {
      expect(loadProgress()).toEqual({});
    });

    it("returns empty object on corrupted JSON", () => {
      store["test-trainer-progress"] = "{bad json";
      expect(loadProgress()).toEqual({});
    });

    it("handles localStorage errors gracefully", () => {
      vi.spyOn(mockLocalStorage, "setItem").mockImplementation(() => {
        throw new Error("quota exceeded");
      });
      expect(() => saveProgress(1, 100, [])).not.toThrow();
    });
  });

  // --- saveCurrentSession / loadCurrentSession ---
  describe("saveCurrentSession / loadCurrentSession", () => {
    it("saves and loads session", () => {
      const cases = [makeTestCase("1"), makeTestCase("2")];
      saveCurrentSession(5, cases);
      const loaded = loadCurrentSession(5);
      expect(loaded).toEqual(cases);
    });

    it("returns null when no session saved", () => {
      expect(loadCurrentSession(99)).toBeNull();
    });

    it("returns null on corrupted JSON", () => {
      store["test-trainer-session-3"] = "not json";
      expect(loadCurrentSession(3)).toBeNull();
    });

    it("handles localStorage errors gracefully", () => {
      vi.spyOn(mockLocalStorage, "setItem").mockImplementation(() => {
        throw new Error("fail");
      });
      expect(() => saveCurrentSession(1, [])).not.toThrow();
    });
  });

  // --- exportAllProgress / importAllProgress ---
  describe("exportAllProgress / importAllProgress", () => {
    it("exports all test-trainer keys", () => {
      store["test-trainer-progress"] = '{"1":{"score":80}}';
      store["test-trainer-streak"] = '{"currentStreak":1}';
      store["some-other-key"] = "ignored";
      const exported = exportAllProgress();
      const parsed = JSON.parse(exported);
      expect(parsed["test-trainer-progress"]).toBe('{"1":{"score":80}}');
      expect(parsed["test-trainer-streak"]).toBe('{"currentStreak":1}');
      expect(parsed["some-other-key"]).toBeUndefined();
    });

    it("returns empty object when nothing saved", () => {
      const exported = exportAllProgress();
      expect(JSON.parse(exported)).toEqual({});
    });

    it("imports valid JSON data", () => {
      const result = importAllProgress(
        JSON.stringify({ "test-trainer-progress": '{"a":1}' })
      );
      expect(result).toBe(true);
      expect(store["test-trainer-progress"]).toBe('{"a":1}');
    });

    it("imports non-string values by stringifying them", () => {
      const result = importAllProgress(
        JSON.stringify({ "test-trainer-streak": { currentStreak: 5 } })
      );
      expect(result).toBe(true);
      expect(store["test-trainer-streak"]).toBe('{"currentStreak":5}');
    });

    it("rejects non-object JSON", () => {
      expect(importAllProgress('"just a string"')).toBe(false);
      expect(importAllProgress("42")).toBe(false);
      expect(importAllProgress("null")).toBe(false);
    });

    it("rejects invalid JSON", () => {
      expect(importAllProgress("{bad}")).toBe(false);
    });

    it("skips keys not starting with test-trainer-", () => {
      importAllProgress(JSON.stringify({ "other-key": "val" }));
      expect(store["other-key"]).toBeUndefined();
    });

    it("handles export errors gracefully", () => {
      vi.spyOn(mockLocalStorage, "key").mockImplementation(() => {
        throw new Error("fail");
      });
      expect(exportAllProgress()).toBe("{}");
    });
  });

  // --- clearAllProgress ---
  describe("clearAllProgress", () => {
    it("removes all test-trainer keys", () => {
      store["test-trainer-progress"] = "{}";
      store["test-trainer-streak"] = "{}";
      store["test-trainer-theory-viewed"] = "[]";
      store["test-trainer-marathons"] = "[]";
      store["other-data"] = "keep";
      clearAllProgress();
      expect(store["test-trainer-progress"]).toBeUndefined();
      expect(store["test-trainer-streak"]).toBeUndefined();
      expect(store["test-trainer-theory-viewed"]).toBeUndefined();
      expect(store["test-trainer-marathons"]).toBeUndefined();
      expect(store["other-data"]).toBe("keep");
    });

    it("handles localStorage errors gracefully", () => {
      vi.spyOn(mockLocalStorage, "removeItem").mockImplementation(() => {
        throw new Error("fail");
      });
      expect(() => clearAllProgress()).not.toThrow();
    });
  });

  // --- saveAttempt / loadAttemptHistory / getTaskHistory / getTaskBestCoverage ---
  describe("attempt history", () => {
    it("saves and loads attempt history", () => {
      saveAttempt({
        taskId: 1,
        score: 75,
        ecCoverage: 0.5,
        bvCoverage: 0.6,
        correctnessScore: 0.8,
        timestamp: Date.now(),
        testCasesCount: 3,
      });
      const history = loadAttemptHistory();
      expect(history).toHaveLength(1);
      expect(history[0].taskId).toBe(1);
    });

    it("keeps last 50 attempts", () => {
      for (let i = 0; i < 55; i++) {
        saveAttempt({
          taskId: i,
          score: i,
          ecCoverage: 0,
          bvCoverage: 0,
          correctnessScore: 0,
          timestamp: i,
          testCasesCount: 1,
        });
      }
      expect(loadAttemptHistory()).toHaveLength(50);
    });

    it("filters history by task ID", () => {
      saveAttempt({
        taskId: 1,
        score: 50,
        ecCoverage: 0.3,
        bvCoverage: 0.4,
        correctnessScore: 0.5,
        timestamp: 1,
        testCasesCount: 1,
      });
      saveAttempt({
        taskId: 2,
        score: 60,
        ecCoverage: 0.4,
        bvCoverage: 0.5,
        correctnessScore: 0.6,
        timestamp: 2,
        testCasesCount: 1,
      });
      const task1History = getTaskHistory(1);
      expect(task1History).toHaveLength(1);
      expect(task1History[0].taskId).toBe(1);
    });

    it("returns best coverage for a task", () => {
      saveAttempt({
        taskId: 1,
        score: 50,
        ecCoverage: 0.3,
        bvCoverage: 0.4,
        correctnessScore: 0.5,
        timestamp: 1,
        testCasesCount: 1,
      });
      saveAttempt({
        taskId: 1,
        score: 70,
        ecCoverage: 0.7,
        bvCoverage: 0.2,
        correctnessScore: 0.8,
        timestamp: 2,
        testCasesCount: 1,
      });
      const best = getTaskBestCoverage(1);
      expect(best).toEqual({ bestEc: 0.7, bestBv: 0.4 });
    });

    it("returns zeros when no history for task", () => {
      expect(getTaskBestCoverage(999)).toEqual({ bestEc: 0, bestBv: 0 });
    });

    it("handles corrupted history gracefully", () => {
      store["test-trainer-history"] = "not json";
      expect(loadAttemptHistory()).toEqual([]);
    });
  });

  // --- saveTaskNote / loadTaskNote ---
  describe("task notes", () => {
    it("saves and loads notes", () => {
      saveTaskNote(3, "Important note");
      expect(loadTaskNote(3)).toBe("Important note");
    });

    it("returns empty string when no note", () => {
      expect(loadTaskNote(99)).toBe("");
    });

    it("handles localStorage errors gracefully", () => {
      vi.spyOn(mockLocalStorage, "setItem").mockImplementation(() => {
        throw new Error("fail");
      });
      expect(() => saveTaskNote(1, "note")).not.toThrow();
    });
  });

  // --- saveGlobalNotes / loadGlobalNotes ---
  describe("global notes", () => {
    it("saves and loads global notes", () => {
      saveGlobalNotes("My study notes");
      expect(loadGlobalNotes()).toBe("My study notes");
    });

    it("returns empty string when no notes", () => {
      expect(loadGlobalNotes()).toBe("");
    });

    it("handles localStorage errors gracefully", () => {
      vi.spyOn(mockLocalStorage, "setItem").mockImplementation(() => {
        throw new Error("fail");
      });
      expect(() => saveGlobalNotes("note")).not.toThrow();
    });
  });

  // --- saveStreak / loadStreak ---
  describe("streak", () => {
    function getTodayStr(): string {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }

    function getYesterdayStr(): string {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    it("starts a new streak when no prior data", async () => {
      const result = await saveStreak();
      expect(result.currentStreak).toBe(1);
      expect(result.lastActiveDate).toBe(getTodayStr());
    });

    it("continues streak when last active yesterday", async () => {
      store["test-trainer-streak"] = JSON.stringify({
        currentStreak: 3,
        longestStreak: 3,
        lastActiveDate: getYesterdayStr(),
      });
      const result = await saveStreak();
      expect(result.currentStreak).toBe(4);
      expect(result.longestStreak).toBe(4);
    });

    it("resets streak when gap > 1 day", async () => {
      store["test-trainer-streak"] = JSON.stringify({
        currentStreak: 5,
        longestStreak: 5,
        lastActiveDate: "2020-01-01",
      });
      const result = await saveStreak();
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(5); // preserves longest
    });

    it("does not increase streak when already active today", async () => {
      store["test-trainer-streak"] = JSON.stringify({
        currentStreak: 2,
        longestStreak: 2,
        lastActiveDate: getTodayStr(),
      });
      const result = await saveStreak();
      expect(result.currentStreak).toBe(2);
    });

    it("loads streak data", () => {
      store["test-trainer-streak"] = JSON.stringify({
        currentStreak: 7,
        longestStreak: 10,
        lastActiveDate: "2024-01-15",
      });
      expect(loadStreak()).toEqual({
        currentStreak: 7,
        longestStreak: 10,
        lastActiveDate: "2024-01-15",
      });
    });

    it("returns defaults when no streak data", () => {
      expect(loadStreak()).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: "",
      });
    });

    it("returns defaults on corrupted data", () => {
      store["test-trainer-streak"] = "bad";
      expect(loadStreak()).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: "",
      });
    });

    it("handles localStorage errors gracefully", async () => {
      vi.spyOn(mockLocalStorage, "setItem").mockImplementation(() => {
        throw new Error("fail");
      });
      await expect(saveStreak()).resolves.not.toThrow();
    });
  });

  // --- Marathon ---
  describe("marathon", () => {
    it("saves and loads marathon records", () => {
      saveMarathonRecord({
        timestamp: 1,
        totalTasks: 10,
        completedTasks: 8,
        avgScore: 0.75,
        totalTimeSec: 600,
      });
      const records = loadMarathonRecords();
      expect(records).toHaveLength(1);
      expect(records[0].avgScore).toBe(0.75);
    });

    it("keeps last 20 marathon records", () => {
      for (let i = 0; i < 25; i++) {
        saveMarathonRecord({
          timestamp: i,
          totalTasks: 10,
          completedTasks: 10,
          avgScore: 0.9,
          totalTimeSec: 500,
        });
      }
      expect(loadMarathonRecords()).toHaveLength(20);
    });

    it("counts completed marathons", () => {
      saveMarathonRecord({
        timestamp: 1,
        totalTasks: 10,
        completedTasks: 10,
        avgScore: 0.9,
        totalTimeSec: 500,
      });
      saveMarathonRecord({
        timestamp: 2,
        totalTasks: 10,
        completedTasks: 5,
        avgScore: 0.5,
        totalTimeSec: 300,
      });
      expect(getMarathonsCompleted()).toBe(1);
    });

    it("returns best marathon avg score from completed marathons", () => {
      saveMarathonRecord({
        timestamp: 1,
        totalTasks: 10,
        completedTasks: 10,
        avgScore: 0.8,
        totalTimeSec: 500,
      });
      saveMarathonRecord({
        timestamp: 2,
        totalTasks: 10,
        completedTasks: 10,
        avgScore: 0.95,
        totalTimeSec: 400,
      });
      saveMarathonRecord({
        timestamp: 3,
        totalTasks: 10,
        completedTasks: 5, // not completed
        avgScore: 1.0,
        totalTimeSec: 200,
      });
      expect(getBestMarathonAvgScore()).toBe(0.95);
    });

    it("returns 0 when no completed marathons", () => {
      expect(getBestMarathonAvgScore()).toBe(0);
      expect(getMarathonsCompleted()).toBe(0);
    });

    it("handles localStorage errors gracefully", () => {
      vi.spyOn(mockLocalStorage, "setItem").mockImplementation(() => {
        throw new Error("fail");
      });
      const minimalRecord = { timestamp: 0, totalTasks: 0, completedTasks: 0, avgScore: 0, totalTimeSec: 0 };
      expect(() => saveMarathonRecord(minimalRecord)).not.toThrow();
    });
  });

  // --- Theory sections ---
  describe("theory sections", () => {
    it("marks section as viewed", () => {
      markTheorySectionViewed("intro");
      expect(isTheorySectionViewed("intro")).toBe(true);
    });

    it("does not duplicate viewed sections", () => {
      markTheorySectionViewed("intro");
      markTheorySectionViewed("intro");
      const viewed = loadTheorySectionsViewed();
      expect(viewed.filter((v) => v === "intro")).toHaveLength(1);
    });

    it("loads empty array when no data", () => {
      expect(loadTheorySectionsViewed()).toEqual([]);
    });

    it("clears theory progress", () => {
      markTheorySectionViewed("intro");
      clearTheoryProgress();
      expect(loadTheorySectionsViewed()).toEqual([]);
    });

    it("handles localStorage errors gracefully", () => {
      vi.spyOn(mockLocalStorage, "setItem").mockImplementation(() => {
        throw new Error("fail");
      });
      expect(() => markTheorySectionViewed("x")).not.toThrow();
    });
  });
});
