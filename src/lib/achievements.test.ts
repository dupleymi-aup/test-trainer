// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  achievements,
  checkAndUnlockAchievements,
  loadUnlockedAchievements,
  saveUnlockedAchievements,
  type AchievementContext,
} from "./achievements";

function makeContext(overrides: Partial<AchievementContext> = {}): AchievementContext {
  return {
    completedTasks: 0,
    totalTasks: 10,
    bestScores: {},
    totalAttempts: 0,
    perfectScores: 0,
    attemptHistory: [],
    ...overrides,
  };
}

describe("achievements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("loadUnlockedAchievements / saveUnlockedAchievements", () => {
    it("returns empty array when nothing saved", () => {
      expect(loadUnlockedAchievements()).toEqual([]);
    });

    it("saves and loads achievement IDs", () => {
      saveUnlockedAchievements(["first_blood", "first_perfect"]);
      expect(loadUnlockedAchievements()).toEqual(["first_blood", "first_perfect"]);
    });

    it("returns empty array on corrupted localStorage", () => {
      localStorage.setItem("test-trainer-achievements", "not-json!!!");
      expect(loadUnlockedAchievements()).toEqual([]);
    });
  });

  describe("checkAndUnlockAchievements", () => {
    it("unlocks 'first_blood' when totalAttempts >= 1", () => {
      const ctx = makeContext({ totalAttempts: 1 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("first_blood");
    });

    it("does not unlock 'first_blood' with 0 attempts", () => {
      const ctx = makeContext({ totalAttempts: 0 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).not.toContain("first_blood");
    });

    it("unlocks 'first_perfect' when perfectScores >= 1", () => {
      const ctx = makeContext({ perfectScores: 1 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("first_perfect");
    });

    it("unlocks 'half_done' when completedTasks >= ceil(totalTasks/2)", () => {
      const ctx = makeContext({ completedTasks: 5, totalTasks: 10 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("half_done");
    });

    it("unlocks 'all_done' when all tasks completed", () => {
      const ctx = makeContext({ completedTasks: 10, totalTasks: 10 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("all_done");
    });

    it("unlocks 'all_perfect' when all tasks perfect", () => {
      const ctx = makeContext({ perfectScores: 10, totalTasks: 10 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("all_perfect");
    });

    it("unlocks 'persistent' when totalAttempts >= 10", () => {
      const ctx = makeContext({ totalAttempts: 10 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("persistent");
    });

    it("unlocks 'explorer' when all tasks attempted", () => {
      const bestScores: Record<number, number> = {};
      for (let i = 1; i <= 10; i++) bestScores[i] = 50;
      const ctx = makeContext({ bestScores, totalTasks: 10 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("explorer");
    });

    it("unlocks 'good_student' when 3 tasks have score >= 90", () => {
      const bestScores: Record<number, number> = { 1: 95, 2: 92, 3: 100 };
      const ctx = makeContext({ bestScores });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("good_student");
    });

    it("unlocks 'boundary_hunter' when maxBvCoverage >= 100", () => {
      const ctx = makeContext({ maxBvCoverage: 100 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("boundary_hunter");
    });

    it("unlocks 'completer' when maxEcCoverage >= 100", () => {
      const ctx = makeContext({ maxEcCoverage: 100 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("completer");
    });

    it("unlocks 'diverse_tester' when usedAllCategories is true", () => {
      const ctx = makeContext({ usedAllCategories: true });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("diverse_tester");
    });

    it("unlocks 'theory_explorer' when theorySectionsRead >= 5", () => {
      const ctx = makeContext({ theorySectionsRead: 5 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("theory_explorer");
    });

    it("unlocks 'self_corrector' when scoreImprovements >= 1", () => {
      const ctx = makeContext({ scoreImprovements: 1 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("self_corrector");
    });

    it("unlocks 'consistent_learner' when daysActive >= 5", () => {
      const ctx = makeContext({ daysActive: 5 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("consistent_learner");
    });

    it("unlocks 'error_guesser' when exceptionTestTasks >= 3", () => {
      const ctx = makeContext({ exceptionTestTasks: 3 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("error_guesser");
    });

    it("unlocks 'marathon_finisher' when marathonCompleted >= 1", () => {
      const ctx = makeContext({ marathonCompleted: 1 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("marathon_finisher");
    });

    it("unlocks 'marathon_champion' when bestMarathonScore >= 90", () => {
      const ctx = makeContext({ bestMarathonScore: 90 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("marathon_champion");
    });

    it("unlocks 'exam_passer' when examsCompleted >= 1", () => {
      const ctx = makeContext({ examsCompleted: 1 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("exam_passer");
    });

    it("unlocks 'exam_expert' when examsCompleted >= 3", () => {
      const ctx = makeContext({ examsCompleted: 3 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("exam_expert");
    });

    it("unlocks 'speed_demon' when examAvgScore >= 80", () => {
      const ctx = makeContext({ examAvgScore: 80 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("speed_demon");
    });

    it("unlocks 'exam_perfect' when examAvgScore >= 95", () => {
      const ctx = makeContext({ examAvgScore: 95 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("exam_perfect");
    });

    it("unlocks 'comeback' when scoreImprovements >= 2", () => {
      const ctx = makeContext({ scoreImprovements: 2 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toContain("comeback");
    });

    it("does not re-unlock previously unlocked achievements", () => {
      saveUnlockedAchievements(["first_blood"]);
      const ctx = makeContext({ totalAttempts: 1 });
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).not.toContain("first_blood");
    });

    it("returns empty array when nothing to unlock", () => {
      const ctx = makeContext({});
      const unlocked = checkAndUnlockAchievements(ctx);
      expect(unlocked).toEqual([]);
    });
  });

  describe("progressFn", () => {
    function findAchievement(id: string) {
      const ach = achievements.find((a) => a.id === id) as NonNullable<typeof achievements[number]>;
      expect(ach).toBeDefined();
      return ach;
    }

    it("first_blood progress returns min(attempts, 1)", () => {
      const ach = findAchievement("first_blood");
      const ctx = makeContext({ totalAttempts: 0 });
      expect(ach.progressFn?.(ctx)).toBe(0);
    });

    it("first_blood progress caps at 1", () => {
      const ach = findAchievement("first_blood");
      const ctx = makeContext({ totalAttempts: 5 });
      expect(ach.progressFn?.(ctx)).toBe(1);
    });

    it("half_done progress is proportional", () => {
      const ach = findAchievement("half_done");
      const ctx = makeContext({ completedTasks: 3, totalTasks: 10 });
      expect(ach.progressFn?.(ctx)).toBeCloseTo(3 / 5);
    });

    it("all_done progress is proportional", () => {
      const ach = findAchievement("all_done");
      const ctx = makeContext({ completedTasks: 7, totalTasks: 10 });
      expect(ach.progressFn?.(ctx)).toBeCloseTo(0.7);
    });

    it("boundary_hunter progress uses maxBvCoverage / 100", () => {
      const ach = findAchievement("boundary_hunter");
      const ctx = makeContext({ maxBvCoverage: 50 });
      expect(ach.progressFn?.(ctx)).toBeCloseTo(0.5);
    });

    it("diverse_tester progress from testCaseCategories", () => {
      const ach = findAchievement("diverse_tester");
      const ctx = makeContext({
        testCaseCategories: new Set(["Нормальное значение", "Исключение"]),
      });
      expect(ach.progressFn?.(ctx)).toBeCloseTo(0.5);
    });

    it("explorer progress is proportional", () => {
      const ach = findAchievement("explorer");
      const bestScores: Record<number, number> = { 1: 50, 2: 60, 3: 70 };
      const ctx = makeContext({ bestScores, totalTasks: 10 });
      expect(ach.progressFn?.(ctx)).toBeCloseTo(0.3);
    });
  });

  describe("all achievements have required fields", () => {
    it("every achievement has id, nameKey, descriptionKey, icon, condition", () => {
      for (const ach of achievements) {
        expect(ach.id).toBeTruthy();
        expect(ach.nameKey).toBeTruthy();
        expect(ach.descriptionKey).toBeTruthy();
        expect(ach.icon).toBeTruthy();
        expect(typeof ach.condition).toBe("function");
      }
    });

    it("no duplicate IDs", () => {
      const ids = achievements.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
