/**
 * Format a duration in seconds into a short human-readable Russian string.
 * Examples: 45 → "45с", 125 → "2м", 3661 → "61м"
 */
export function formatDurationShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return m > 0 ? `${m}м` : `${seconds}с`;
}

/**
 * Format a duration in seconds into a verbose Russian string with hours, minutes and seconds.
 * Examples: 45 → "45с", 125 → "2м 5с", 3661 → "1ч 1м 1с"
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}ч ${m}м ${s}с`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

/**
 * Format seconds into a timer display (M:SS or H:MM:SS).
 * Examples: 65 → "1:05", 3661 → "1:01:01"
 */
export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
