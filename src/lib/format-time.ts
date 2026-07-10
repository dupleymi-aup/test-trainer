type TimeUnitLabels = { hour: string; minute: string; second: string };

const defaultLabels: TimeUnitLabels = { hour: "ч", minute: "м", second: "с" };

function resolveLabels(locale?: string | null): TimeUnitLabels {
  if (!locale) return defaultLabels;
  if (locale === "en") return { hour: "hr", minute: "min", second: "sec" };
  if (locale === "zh") return { hour: "时", minute: "分", second: "秒" };
  return defaultLabels;
}

/**
 * Format a duration in seconds into a short human-readable string.
 * Examples (ru): 45 → "45с", 125 → "2м 5с", 3661 → "1ч 1м"
 * Examples (en): 45 → "45sec", 125 → "2min 5sec", 3661 → "1hr 1min"
 */
export function formatDurationShort(seconds: number, locale?: string | null): string {
  const { hour, minute, second } = resolveLabels(locale);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}${hour} ${m}${minute}`;
  if (m > 0) return m > 0 && s > 0 ? `${m}${minute} ${s}${second}` : `${m}${minute}`;
  return `${s}${second}`;
}

/**
 * Format a duration in seconds into a verbose string with hours, minutes and seconds.
 * Examples (ru): 45 → "45с", 125 → "2м 5с", 3661 → "1ч 1м 1с"
 * Examples (en): 45 → "45sec", 125 → "2min 5sec", 3661 → "1hr 1min 1sec"
 */
export function formatDuration(seconds: number, locale?: string | null): string {
  const { hour, minute, second } = resolveLabels(locale);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}${hour} ${m}${minute} ${s}${second}`;
  if (m > 0) return `${m}${minute} ${s}${second}`;
  return `${s}${second}`;
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
