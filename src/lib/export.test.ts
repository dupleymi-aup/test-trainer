import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the storage module
vi.mock("@/lib/storage", () => ({
  loadAttemptHistory: vi.fn(),
  loadProgress: vi.fn(),
  loadStreak: vi.fn(),
}));

vi.mock("@/lib/achievements", () => ({
  loadUnlockedAchievements: vi.fn(),
  achievements: [
    { id: "first_attempt", name: "First Attempt" },
    { id: "perfect_score", name: "Perfect Score" },
    { id: "streak_master", name: "Streak Master" },
  ],
}));

vi.mock("@/lib/tasks", () => ({
  tasks: [
    { id: 1, name: "Email Validation" },
    { id: 2, name: "Age Range Check" },
    { id: 3, name: "Phone Number Format" },
  ],
}));

import { generateExportJSON, generateExportCSV } from "./export";
import * as storage from "@/lib/storage";
import * as achievementsModule from "@/lib/achievements";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-01-15T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("generateExportJSON", () => {
  it("generates valid JSON with correct structure", () => {
    vi.mocked(storage.loadAttemptHistory).mockReturnValue([]);
    vi.mocked(storage.loadProgress).mockReturnValue({});
    vi.mocked(storage.loadStreak).mockReturnValue({ currentStreak: 0, longestStreak: 0 });
    vi.mocked(achievementsModule.loadUnlockedAchievements).mockReturnValue([]);

    const result = generateExportJSON();
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty("meta");
    expect(parsed).toHaveProperty("summary");
    expect(parsed).toHaveProperty("bestProgress");
    expect(parsed).toHaveProperty("attempts");
    expect(parsed).toHaveProperty("achievements");
    expect(parsed.meta.version).toBe("1.0.0");
    expect(parsed.meta.exportedAt).toBe("2025-01-15T10:00:00.000Z");
  });

  it("calculates correct summary stats", () => {
    const attempts = [
      { taskId: 1, score: 80, ecCoverage: 70, bvCoverage: 60, correctnessScore: 75, timestamp: Date.now(), testCasesCount: 5 },
      { taskId: 1, score: 90, ecCoverage: 80, bvCoverage: 70, correctnessScore: 85, timestamp: Date.now(), testCasesCount: 6 },
      { taskId: 2, score: 100, ecCoverage: 100, bvCoverage: 100, correctnessScore: 100, timestamp: Date.now(), testCasesCount: 8 },
    ];
    vi.mocked(storage.loadAttemptHistory).mockReturnValue(attempts);
    vi.mocked(storage.loadProgress).mockReturnValue({
      "1": { score: 90, testCases: [{}, {}, {}] },
      "2": { score: 100, testCases: [{}, {}, {}, {}] },
    });
    vi.mocked(storage.loadStreak).mockReturnValue({ currentStreak: 3, longestStreak: 5 });
    vi.mocked(achievementsModule.loadUnlockedAchievements).mockReturnValue(["first_attempt", "perfect_score"]);

    const result = JSON.parse(generateExportJSON());

    expect(result.summary.totalAttempts).toBe(3);
    expect(result.summary.avgScore).toBe(90); // (80+90+100)/3 = 90
    expect(result.summary.currentStreak).toBe(3);
    expect(result.summary.longestStreak).toBe(5);
    expect(result.summary.achievementsUnlocked).toBe(2);
    expect(result.summary.achievementsTotal).toBe(3);
  });

  it("handles empty data gracefully", () => {
    vi.mocked(storage.loadAttemptHistory).mockReturnValue([]);
    vi.mocked(storage.loadProgress).mockReturnValue({});
    vi.mocked(storage.loadStreak).mockReturnValue({ currentStreak: 0, longestStreak: 0 });
    vi.mocked(achievementsModule.loadUnlockedAchievements).mockReturnValue([]);

    const result = JSON.parse(generateExportJSON());
    expect(result.summary.avgScore).toBe(0);
    expect(result.summary.totalAttempts).toBe(0);
    expect(Object.keys(result.bestProgress)).toHaveLength(0);
  });
});

describe("generateExportCSV", () => {
  it("includes BOM for UTF-8 encoding", () => {
    vi.mocked(storage.loadAttemptHistory).mockReturnValue([]);
    vi.mocked(storage.loadProgress).mockReturnValue({});
    vi.mocked(storage.loadStreak).mockReturnValue({ currentStreak: 0, longestStreak: 0 });
    vi.mocked(achievementsModule.loadUnlockedAchievements).mockReturnValue([]);

    const result = generateExportCSV();
    expect(result.charCodeAt(0)).toBe(0xfeff);
  });

  it("includes summary section headers", () => {
    vi.mocked(storage.loadAttemptHistory).mockReturnValue([]);
    vi.mocked(storage.loadProgress).mockReturnValue({});
    vi.mocked(storage.loadStreak).mockReturnValue({ currentStreak: 2, longestStreak: 4 });
    vi.mocked(achievementsModule.loadUnlockedAchievements).mockReturnValue(["first_attempt"]);

    const result = generateExportCSV();
    expect(result).toContain("Section,Key,Value");
    expect(result).toContain("Summary,Total Attempts,0");
    expect(result).toContain("Summary,Current Streak,2");
    expect(result).toContain("Summary,Longest Streak,4");
  });

  it("escapes values containing commas", () => {
    vi.mocked(storage.loadAttemptHistory).mockReturnValue([]);
    vi.mocked(storage.loadProgress).mockReturnValue({
      "1": { score: 85, testCases: [{}, {}] },
    });
    vi.mocked(storage.loadStreak).mockReturnValue({ currentStreak: 0, longestStreak: 0 });
    vi.mocked(achievementsModule.loadUnlockedAchievements).mockReturnValue([]);

    const result = generateExportCSV();
    // Task name "Email Validation" doesn't have commas, but if it did, it would be quoted
    expect(result).toContain("Progress,");
  });

  it("includes achievements section with locked/unlocked status", () => {
    vi.mocked(storage.loadAttemptHistory).mockReturnValue([]);
    vi.mocked(storage.loadProgress).mockReturnValue({});
    vi.mocked(storage.loadStreak).mockReturnValue({ currentStreak: 0, longestStreak: 0 });
    vi.mocked(achievementsModule.loadUnlockedAchievements).mockReturnValue(["first_attempt"]);

    const result = generateExportCSV();
    expect(result).toContain("Section,Achievement ID,Status");
    expect(result).toContain("first_attempt,Unlocked");
    expect(result).toContain("perfect_score,Locked");
  });
});
