interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  predict: (x: number) => number;
}

/**
 * Simple linear regression using least squares.
 * Returns slope, intercept, R-squared, and a predict function.
 */
export function computeLinearRegression(
  points: [number, number][]
): RegressionResult | null {
  if (points.length < 2) return null;

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const [x, y] of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const [x, y] of points) {
    const predicted = slope * x + intercept;
    ssTot += (y - meanY) ** 2;
    ssRes += (y - predicted) ** 2;
  }

  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return {
    slope,
    intercept,
    r2: Math.max(0, Math.min(1, r2)),
    predict: (x: number) => slope * x + intercept,
  };
}

/**
 * Simple t-test approximation for two independent samples.
 * Returns t-statistic and whether the difference is significant at p < 0.05.
 */
export function tTest(
  sampleA: number[],
  sampleB: number[]
): { t: number; significant: boolean; pApprox: number } | null {
  if (sampleA.length < 2 || sampleB.length < 2) return null;

  const meanA = sampleA.reduce((s, v) => s + v, 0) / sampleA.length;
  const meanB = sampleB.reduce((s, v) => s + v, 0) / sampleB.length;

  const varA =
    sampleA.reduce((s, v) => s + (v - meanA) ** 2, 0) / (sampleA.length - 1);
  const varB =
    sampleB.reduce((s, v) => s + (v - meanB) ** 2, 0) / (sampleB.length - 1);

  const seA = varA / sampleA.length;
  const seB = varB / sampleB.length;
  const seDiff = Math.sqrt(seA + seB);

  if (seDiff === 0) return { t: 0, significant: false, pApprox: 1 };

  const t = (meanA - meanB) / seDiff;
  // Approximate: |t| > 1.96 is significant at p < 0.05 for large samples
  const significant = Math.abs(t) > 1.96;

  // Very rough p-value approximation
  const absT = Math.abs(t);
  const pApprox = absT > 3.5 ? 0.001 : absT > 2.58 ? 0.01 : absT > 1.96 ? 0.05 : 0.1;

  return { t: Math.round(t * 1000) / 1000, significant, pApprox };
}

/**
 * Z-score based anomaly detection threshold.
 * Returns values that are more than `threshold` standard deviations from the mean.
 */
export function findOutliers(
  values: number[],
  threshold: number = 2
): { index: number; value: number; zScore: number }[] {
  if (values.length < 3) return [];

  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const std = Math.sqrt(
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  );

  if (std === 0) return [];

  return values
    .map((v, i) => ({ index: i, value: v, zScore: (v - mean) / std }))
    .filter((d) => Math.abs(d.zScore) > threshold);
}
