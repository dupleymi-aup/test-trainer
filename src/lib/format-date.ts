import { MS_PER_HOUR, MS_PER_DAY, MS_PER_MINUTE } from "@/lib/time-constants";

type RelativeLabels = {
  justNow: string;
  minuteAgo: (n: number) => string;
  hourAgo: (n: number) => string;
  dayAgo: (n: number) => string;
};

function ruPlural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${forms[0]}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${forms[1]}`;
  return `${n} ${forms[2]}`;
}

function zhPlural(n: number, suffix: string): string {
  return `${n}${suffix}`;
}

const relativeLabels: Record<string, RelativeLabels> = {
  en: {
    justNow: "just now",
    minuteAgo: (n) => (n === 1 ? "1 minute ago" : `${n} minutes ago`),
    hourAgo: (n) => (n === 1 ? "1 hour ago" : `${n} hours ago`),
    dayAgo: (n) => (n === 1 ? "1 day ago" : `${n} days ago`),
  },
  ru: {
    justNow: "только что",
    minuteAgo: (n) => ruPlural(n, ["минута назад", "минуты назад", "минут назад"]),
    hourAgo: (n) => ruPlural(n, ["час назад", "часа назад", "часов назад"]),
    dayAgo: (n) => ruPlural(n, ["день назад", "дня назад", "дней назад"]),
  },
  zh: {
    justNow: "刚刚",
    minuteAgo: (n) => zhPlural(n, "分钟前"),
    hourAgo: (n) => zhPlural(n, "小时前"),
    dayAgo: (n) => zhPlural(n, "天前"),
  },
};

const localeToBcp47: Record<string, string> = {
  en: "en-US",
  ru: "ru-RU",
  zh: "zh-CN",
};

/**
 * Format a date string into a relative time label, respecting the user's locale.
 * Supports proper pluralization for English, Russian and Chinese.
 */
export function formatRelativeDate(dateStr: string, locale: string = "ru"): string {
  const labels = relativeLabels[locale] ?? relativeLabels.ru;
  const bcp47 = localeToBcp47[locale] ?? localeToBcp47.ru;

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return labels.justNow;

  const diffMinutes = Math.floor(diffMs / MS_PER_MINUTE);
  const diffHours = Math.floor(diffMs / MS_PER_HOUR);
  const diffDays = Math.floor(diffMs / MS_PER_DAY);

  if (diffMinutes < 1) return labels.justNow;
  if (diffMinutes < 60) return labels.minuteAgo(diffMinutes);
  if (diffHours < 24) return labels.hourAgo(diffHours);
  if (diffDays < 7) return labels.dayAgo(diffDays);

  return date.toLocaleDateString(bcp47, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
