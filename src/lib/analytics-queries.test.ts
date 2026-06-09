import { describe, it, expect } from "vitest";
import { computeLinearRegression, tTest, findOutliers } from "./analytics-queries";

describe("computeLinearRegression", () => {
  it("returns null for less than 2 points", () => {
    expect(computeLinearRegression([])).toBeNull();
    expect(computeLinearRegression([[1, 2]])).toBeNull();
  });

  it("calculates perfect linear relationship", () => {
    const result = computeLinearRegression([
      [0, 0],
      [1, 2],
      [2, 4],
      [3, 6],
    ]);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.slope).toBe(2);
    expect(result.intercept).toBe(0);
    expect(result.r2).toBe(1);
    expect(result.predict(5)).toBe(10);
  });

  it("calculates regression with noise", () => {
    const result = computeLinearRegression([
      [0, 10],
      [1, 12],
      [2, 11],
      [3, 14],
      [4, 13],
    ]);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.slope).toBeGreaterThan(0);
    expect(result.r2).toBeGreaterThan(0.5);
  });

  it("handles flat line", () => {
    const result = computeLinearRegression([
      [0, 50],
      [1, 50],
      [2, 50],
    ]);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.slope).toBe(0);
    expect(result.r2).toBe(1);
  });
});

describe("tTest", () => {
  it("returns null for small samples", () => {
    expect(tTest([1], [2])).toBeNull();
    expect(tTest([], [1, 2])).toBeNull();
  });

  it("detects significant difference", () => {
    const result = tTest(
      [10, 11, 12, 10, 11],
      [20, 21, 22, 20, 21]
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.significant).toBe(true);
    expect(Math.abs(result.t)).toBeGreaterThan(1.96);
  });

  it("detects no significant difference for similar samples", () => {
    const result = tTest(
      [10, 11, 12, 10, 11],
      [10, 12, 11, 10, 12]
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.significant).toBe(false);
  });

  it("returns t=0 for identical variance and mean", () => {
    const result = tTest(
      [5, 5, 5],
      [5, 5, 5]
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.t).toBe(0);
  });
});

describe("findOutliers", () => {
  it("returns empty for less than 3 values", () => {
    expect(findOutliers([])).toEqual([]);
    expect(findOutliers([1, 2])).toEqual([]);
  });

  it("finds outliers", () => {
    const values = [10, 11, 12, 10, 11, 100, 12, 11];
    const outliers = findOutliers(values, 2);
    expect(outliers.length).toBeGreaterThan(0);
    expect(outliers.some((o) => o.value === 100)).toBe(true);
  });

  it("returns empty for uniform values", () => {
    expect(findOutliers([5, 5, 5, 5])).toEqual([]);
  });

  it("respects threshold", () => {
    const values = [10, 11, 12, 10, 11, 50, 12, 11];
    const strict = findOutliers(values, 1.5);
    const loose = findOutliers(values, 3);
    expect(strict.length).toBeGreaterThanOrEqual(loose.length);
  });
});
