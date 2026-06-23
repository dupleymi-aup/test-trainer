import { describe, it, expect } from "vitest";
import {
  computeStudentStats,
  computeStudentRisk,
  batchComputeStudentRisk,
  generateRecommendations,
  computeAnomalyFlags,
  predictNextScore,
} from "./risk-analysis";

function makeAttempt(overrides: Partial<Parameters<typeof computeStudentRisk>[0][number]> = {}) {
  return {
    score: 70,
    ecCoverage: 60,
    bvCoverage: 50,
    correctness: 65,
    timeSpent: 300,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("computeStudentStats", () => {
  it("returns zeros for empty attempts", () => {
    const stats = computeStudentStats([]);
    expect(stats).toEqual({
      bestScore: 0,
      avgScore: 0,
      avgEc: 0,
      avgBv: 0,
      avgCorrectness: 0,
      totalAttempts: 0,
      avgTimeSpent: 0,
    });
  });

  it("calculates stats for single attempt", () => {
    const stats = computeStudentStats([makeAttempt({ score: 80, ecCoverage: 70, bvCoverage: 60 })]);
    expect(stats.bestScore).toBe(80);
    expect(stats.avgScore).toBe(80);
    expect(stats.avgEc).toBe(70);
    expect(stats.avgBv).toBe(60);
    expect(stats.totalAttempts).toBe(1);
  });

  it("calculates averages across multiple attempts", () => {
    const attempts = [
      makeAttempt({ score: 60, ecCoverage: 50, bvCoverage: 40 }),
      makeAttempt({ score: 80, ecCoverage: 70, bvCoverage: 60 }),
      makeAttempt({ score: 70, ecCoverage: 60, bvCoverage: 50 }),
    ];
    const stats = computeStudentStats(attempts);
    expect(stats.bestScore).toBe(80);
    expect(stats.avgScore).toBe(70);
    expect(stats.avgEc).toBe(60);
    expect(stats.avgBv).toBe(50);
    expect(stats.totalAttempts).toBe(3);
  });

  it("handles missing correctness and timeSpent", () => {
    const attempts = [
      { score: 70, ecCoverage: 60, bvCoverage: 50, createdAt: new Date() },
      { score: 80, ecCoverage: 70, bvCoverage: 60, createdAt: new Date() },
    ];
    const stats = computeStudentStats(attempts);
    expect(stats.avgCorrectness).toBe(0);
    expect(stats.avgTimeSpent).toBe(0);
  });

  it("calculates avgCorrectness when present", () => {
    const attempts = [
      makeAttempt({ correctness: 60 }),
      makeAttempt({ correctness: 80 }),
    ];
    const stats = computeStudentStats(attempts);
    expect(stats.avgCorrectness).toBe(70);
  });

  it("calculates avgTimeSpent when present", () => {
    const attempts = [
      makeAttempt({ timeSpent: 200 }),
      makeAttempt({ timeSpent: 400 }),
    ];
    const stats = computeStudentStats(attempts);
    expect(stats.avgTimeSpent).toBe(300);
  });
});

describe("computeStudentRisk", () => {
  it("returns low risk for empty attempts", () => {
    const result = computeStudentRisk([], new Date());
    expect(result.dropoutRisk).toBe("low");
    expect(result.trend).toBe("stable");
    expect(result.riskFactors).toEqual([]);
    expect(result.recommendations).toEqual([]);
  });

  it("detects low performer risk", () => {
    const attempts = [
      makeAttempt({ score: 30 }),
      makeAttempt({ score: 40 }),
      makeAttempt({ score: 35 }),
    ];
    const result = computeStudentRisk(attempts, new Date());
    expect(result.riskFactors).toContain("low_performer");
  });

  it("detects declining trend", () => {
    const now = new Date();
    const attempts = [
      makeAttempt({ score: 90, createdAt: new Date(now.getTime() - 5 * 86400000) }),
      makeAttempt({ score: 85, createdAt: new Date(now.getTime() - 4 * 86400000) }),
      makeAttempt({ score: 80, createdAt: new Date(now.getTime() - 3 * 86400000) }),
      makeAttempt({ score: 50, createdAt: new Date(now.getTime() - 2 * 86400000) }),
      makeAttempt({ score: 40, createdAt: new Date(now.getTime() - 1 * 86400000) }),
      makeAttempt({ score: 30, createdAt: now }),
    ];
    const result = computeStudentRisk(attempts, new Date(now.getTime() - 10 * 86400000));
    expect(result.trend).toBe("declining");
    expect(result.riskFactors).toContain("declining");
  });

  it("detects improving trend", () => {
    const now = new Date();
    const attempts = [
      makeAttempt({ score: 30, createdAt: new Date(now.getTime() - 5 * 86400000) }),
      makeAttempt({ score: 35, createdAt: new Date(now.getTime() - 4 * 86400000) }),
      makeAttempt({ score: 40, createdAt: new Date(now.getTime() - 3 * 86400000) }),
      makeAttempt({ score: 70, createdAt: new Date(now.getTime() - 2 * 86400000) }),
      makeAttempt({ score: 80, createdAt: new Date(now.getTime() - 1 * 86400000) }),
      makeAttempt({ score: 85, createdAt: now }),
    ];
    const result = computeStudentRisk(attempts, new Date(now.getTime() - 10 * 86400000));
    expect(result.trend).toBe("improving");
  });

  it("detects inactivity", () => {
    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 86400000);
    const attempts = [makeAttempt({ createdAt: fifteenDaysAgo })];
    const result = computeStudentRisk(attempts, new Date(now.getTime() - 20 * 86400000));
    expect(result.riskFactors).toContain("inactive");
  });

  it("detects low engagement", () => {
    const now = new Date();
    const eightDaysAgo = new Date(now.getTime() - 8 * 86400000);
    const attempts = [makeAttempt({ createdAt: eightDaysAgo })];
    const result = computeStudentRisk(attempts, eightDaysAgo);
    expect(result.riskFactors).toContain("low_engagement");
  });

  it("detects poor EC coverage", () => {
    const attempts = [makeAttempt({ ecCoverage: 30 })];
    const result = computeStudentRisk(attempts, new Date());
    expect(result.riskFactors).toContain("poor_ec_coverage");
  });

  it("detects poor BV coverage", () => {
    const attempts = [makeAttempt({ bvCoverage: 20 })];
    const result = computeStudentRisk(attempts, new Date());
    expect(result.riskFactors).toContain("poor_bv_coverage");
  });

  it("returns stable trend for fewer than 6 attempts", () => {
    const attempts = [
      makeAttempt({ score: 90 }),
      makeAttempt({ score: 30 }),
    ];
    const result = computeStudentRisk(attempts, new Date());
    expect(result.trend).toBe("stable");
  });

  it("calculates high dropout risk with multiple factors", () => {
    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 86400000);
    const attempts = [
      makeAttempt({ score: 25, ecCoverage: 20, bvCoverage: 15, createdAt: fifteenDaysAgo }),
    ];
    const result = computeStudentRisk(attempts, new Date(now.getTime() - 20 * 86400000));
    expect(result.dropoutRisk).toBe("high");
  });

  it("calculates medium dropout risk", () => {
    const attempts = [
      makeAttempt({ score: 40, ecCoverage: 40 }),
      makeAttempt({ score: 35, ecCoverage: 35 }),
    ];
    const result = computeStudentRisk(attempts, new Date());
    expect(result.dropoutRisk).toBe("medium");
  });

  it("includes recommendations for each risk factor", () => {
    const attempts = [
      makeAttempt({ score: 20, ecCoverage: 10, bvCoverage: 10 }),
    ];
    const result = computeStudentRisk(attempts, new Date());
    expect(result.recommendations.length).toBeGreaterThanOrEqual(3);
  });
});

describe("generateRecommendations", () => {
  it("suggests reviewing weak areas", () => {
    const recs = generateRecommendations(
      [{ topic: "EC", avgScore: 40 }],
      80, 80, 80, 10
    );
    expect(recs[0]).toContain("EC");
  });

  it("suggests improving EC coverage when low", () => {
    const recs = generateRecommendations([], 50, 80, 80, 10);
    expect(recs.some(r => r.includes("классов эквивалентности"))).toBe(true);
  });

  it("suggests improving BV coverage when low", () => {
    const recs = generateRecommendations([], 80, 50, 80, 10);
    expect(recs.some(r => r.includes("граничных значений"))).toBe(true);
  });

  it("suggests improving correctness when low", () => {
    const recs = generateRecommendations([], 80, 80, 50, 10);
    expect(recs.some(r => r.includes("корректность"))).toBe(true);
  });

  it("suggests more practice when few attempts", () => {
    const recs = generateRecommendations([], 80, 80, 80, 2);
    expect(recs.some(r => r.includes("больше"))).toBe(true);
  });

  it("returns positive message when everything is good", () => {
    const recs = generateRecommendations([], 90, 90, 90, 20);
    expect(recs).toEqual(["Отличная работа! Продолжайте практиковаться и помогать другим студентам"]);
  });

  it("combines multiple recommendations", () => {
    const recs = generateRecommendations(
      [{ topic: "BV", avgScore: 30 }],
      40, 40, 50, 2
    );
    expect(recs.length).toBeGreaterThan(1);
  });
});

describe("computeAnomalyFlags", () => {
  const now = new Date("2024-01-15");
  const day = (n: number) => new Date(now.getTime() - n * 86400000);

  it("returns empty for less than 2 attempts", () => {
    const result = computeAnomalyFlags("1", "Test", "G1", [
      { score: 50, createdAt: now },
    ]);
    expect(result).toEqual([]);
  });

  it("detects sudden drop", () => {
    const result = computeAnomalyFlags("1", "Test", "G1", [
      { score: 80, createdAt: day(2) },
      { score: 40, createdAt: day(1) },
    ]);
    expect(result.some((a) => a.anomalyType === "sudden_drop")).toBe(true);
    expect(result.some((a) => a.severity === "high")).toBe(true);
  });

  it("detects score spike", () => {
    const result = computeAnomalyFlags("1", "Test", "G1", [
      { score: 30, createdAt: day(2) },
      { score: 70, createdAt: day(1) },
    ]);
    expect(result.some((a) => a.anomalyType === "score_spike")).toBe(true);
    expect(result.some((a) => a.severity === "medium")).toBe(true);
  });

  it("detects returned student", () => {
    const result = computeAnomalyFlags("1", "Test", "G1", [
      { score: 70, createdAt: day(30) },
      { score: 60, createdAt: day(5) },
    ]);
    expect(result.some((a) => a.anomalyType === "returned_student")).toBe(true);
  });

  it("detects time anomaly", () => {
    const result = computeAnomalyFlags("1", "Test", "G1", [
      { score: 70, timeSpent: 600, testId: 1, createdAt: day(2) },
      { score: 60, timeSpent: 1800, testId: 1, createdAt: day(1) },
    ], { 1: 500 });
    expect(result.some((a) => a.anomalyType === "time_anomaly")).toBe(true);
  });

  it("does not detect time anomaly when within threshold", () => {
    const result = computeAnomalyFlags("1", "Test", "G1", [
      { score: 70, timeSpent: 600, testId: 1, createdAt: day(2) },
      { score: 60, timeSpent: 800, testId: 1, createdAt: day(1) },
    ], { 1: 500 });
    expect(result.some((a) => a.anomalyType === "time_anomaly")).toBe(false);
  });
});

describe("predictNextScore", () => {
  const day = (n: number) => new Date(Date.now() - n * 86400000);

  it("returns null for less than 3 attempts", () => {
    expect(predictNextScore([
      { score: 50, createdAt: day(2) },
      { score: 60, createdAt: day(1) },
    ])).toBeNull();
  });

  it("predicts improving trend", () => {
    const result = predictNextScore([
      { score: 40, createdAt: day(5) },
      { score: 50, createdAt: day(4) },
      { score: 60, createdAt: day(3) },
      { score: 70, createdAt: day(2) },
      { score: 80, createdAt: day(1) },
    ]);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.trend).toBe("improving");
    expect(result.predicted).toBeGreaterThan(80);
  });

  it("predicts declining trend", () => {
    const result = predictNextScore([
      { score: 90, createdAt: day(5) },
      { score: 80, createdAt: day(4) },
      { score: 70, createdAt: day(3) },
      { score: 60, createdAt: day(2) },
      { score: 50, createdAt: day(1) },
    ]);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.trend).toBe("declining");
    expect(result.predicted).toBeLessThan(50);
  });

  it("predicts stable trend", () => {
    const result = predictNextScore([
      { score: 70, createdAt: day(5) },
      { score: 72, createdAt: day(4) },
      { score: 68, createdAt: day(3) },
      { score: 71, createdAt: day(2) },
      { score: 69, createdAt: day(1) },
    ]);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.trend).toBe("stable");
  });

  it("clamps prediction to 0-100 range", () => {
    const result = predictNextScore([
      { score: 95, createdAt: day(5) },
      { score: 97, createdAt: day(4) },
      { score: 98, createdAt: day(3) },
      { score: 99, createdAt: day(2) },
      { score: 100, createdAt: day(1) },
    ]);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.predicted).toBeLessThanOrEqual(100);
    expect(result.predicted).toBeGreaterThanOrEqual(0);
  });

  it("returns confidence between 0 and 100", () => {
    const result = predictNextScore([
      { score: 50, createdAt: day(5) },
      { score: 55, createdAt: day(4) },
      { score: 60, createdAt: day(3) },
      { score: 65, createdAt: day(2) },
      { score: 70, createdAt: day(1) },
    ]);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });
});

describe("batchComputeStudentRisk", () => {
  it("returns empty map for empty input", () => {
    const result = batchComputeStudentRisk([]);
    expect(result.size).toBe(0);
  });

  it("computes stats and risk for a single student", () => {
    const now = new Date();
    const students = [
      {
        id: "s1",
        createdAt: new Date(now.getTime() - 30 * 86400000),
        attempts: [makeAttempt({ score: 80, ecCoverage: 70, bvCoverage: 60 })],
      },
    ];
    const result = batchComputeStudentRisk(students);
    expect(result.size).toBe(1);
    const entry = result.get("s1");
    expect(entry).toBeDefined();
    expect(entry?.stats.bestScore).toBe(80);
    expect(entry?.risk.dropoutRisk).toBe("low");
  });

  it("computes for multiple students independently", () => {
    const now = new Date();
    const students = [
      {
        id: "good",
        createdAt: now,
        attempts: [
          makeAttempt({ score: 90 }),
          makeAttempt({ score: 95 }),
          makeAttempt({ score: 92 }),
        ],
      },
      {
        id: "bad",
        createdAt: new Date(now.getTime() - 30 * 86400000),
        attempts: [makeAttempt({ score: 20, ecCoverage: 10, bvCoverage: 10 })],
      },
    ];
    const result = batchComputeStudentRisk(students);
    expect(result.size).toBe(2);
    expect(result.get("good")?.risk.dropoutRisk).toBe("low");
    expect(result.get("bad")?.risk.dropoutRisk).not.toBe("low");
  });

  it("handles students with no attempts", () => {
    const students = [
      { id: "empty", createdAt: new Date(), attempts: [] },
    ];
    const result = batchComputeStudentRisk(students);
    const entry = result.get("empty");
    expect(entry).toBeDefined();
    expect(entry?.stats.totalAttempts).toBe(0);
    expect(entry?.risk.riskFactors).toEqual([]);
  });

  it("returns a Map keyed by student ID", () => {
    const students = [
      { id: "a", createdAt: new Date(), attempts: [makeAttempt()] },
      { id: "b", createdAt: new Date(), attempts: [makeAttempt()] },
      { id: "c", createdAt: new Date(), attempts: [makeAttempt()] },
    ];
    const result = batchComputeStudentRisk(students);
    expect(result.has("a")).toBe(true);
    expect(result.has("b")).toBe(true);
    expect(result.has("c")).toBe(true);
    expect(result.has("nonexistent")).toBe(false);
  });

  it("detects high risk student in batch", () => {
    const now = new Date();
    const students = [
      {
        id: "risk",
        createdAt: new Date(now.getTime() - 30 * 86400000),
        attempts: [
          makeAttempt({ score: 20, ecCoverage: 10, bvCoverage: 10, createdAt: new Date(now.getTime() - 20 * 86400000) }),
        ],
      },
    ];
    const result = batchComputeStudentRisk(students);
    expect(result.get("risk")?.risk.dropoutRisk).toBe("high");
    expect(result.get("risk")?.risk.riskFactors.length).toBeGreaterThanOrEqual(4);
  });
});
