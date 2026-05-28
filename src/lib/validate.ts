/**
 * Safely parse a string to a positive integer.
 * Returns the default value if parsing fails or result is not a finite positive number.
 */
export function parsePositiveInt(value: string | null, defaultValue: number): number {
  if (value === null || value === undefined) return defaultValue;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return defaultValue;

  return parsed;
}
