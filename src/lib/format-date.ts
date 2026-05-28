import { MS_PER_HOUR, MS_PER_DAY } from "@/lib/time-constants";

/**
 * Format a date string into a relative time label in Russian.
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / MS_PER_HOUR);
  const diffDays = Math.floor(diffMs / MS_PER_DAY);

  if (diffHours < 1) return "Только что";
  if (diffHours < 24) return `${diffHours}ч назад`;
  if (diffDays < 7) return `${diffDays}д назад`;
  return date.toLocaleDateString("ru-RU");
}
