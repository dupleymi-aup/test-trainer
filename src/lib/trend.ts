/**
 * Shared trend calculation utility.
 * Compares the average score of the first N attempts vs the last N attempts.
 */

interface ScoredAttempt {
  score: number;
}

type TrendResult = "improving" | "stable" | "declining";

/**
 * Compute trend by comparing average score of first vs last attempts.
 * Returns "improving", "stable", or "declining".
 */
export function computeTrend(
  attempts: ScoredAttempt[],
  windowSize = 3,
  threshold = 15
): TrendResult {
  if (attempts.length < windowSize * 2) return "stable";

  const first = attempts.slice(0, windowSize);
  const last = attempts.slice(-windowSize);
  const firstAvg = first.reduce((s, a) => s + a.score, 0) / first.length;
  const lastAvg = last.reduce((s, a) => s + a.score, 0) / last.length;
  const delta = lastAvg - firstAvg;

  if (delta > threshold) return "improving";
  if (delta < -threshold) return "declining";
  return "stable";
}
