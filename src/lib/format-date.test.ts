import { describe, it, expect, vi, afterEach } from "vitest";
import { formatRelativeDate } from "./format-date";

describe("formatRelativeDate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 'just now' for a date less than 1 minute ago", () => {
    const now = new Date();
    vi.setSystemTime(now);
    const dateStr = new Date(now.getTime() - 30 * 1000).toISOString();
    expect(formatRelativeDate(dateStr, "en")).toBe("just now");
  });

  it("returns minutes ago for Russian locale", () => {
    const now = new Date("2024-06-15T12:05:00Z");
    vi.setSystemTime(now);
    const dateStr = "2024-06-15T12:02:00Z";
    const result = formatRelativeDate(dateStr, "ru");
    expect(result).toBe("3 минуты назад");
  });

  it("returns minutes ago for English locale", () => {
    const now = new Date("2024-06-15T12:05:00Z");
    vi.setSystemTime(now);
    const dateStr = "2024-06-15T12:02:00Z";
    const result = formatRelativeDate(dateStr, "en");
    expect(result).toBe("3 minutes ago");
  });

  it("returns singular '1 minute ago' in English", () => {
    const now = new Date("2024-06-15T12:05:00Z");
    vi.setSystemTime(now);
    const dateStr = "2024-06-15T12:04:00Z";
    const result = formatRelativeDate(dateStr, "en");
    expect(result).toBe("1 minute ago");
  });

  it("returns hours ago in Russian", () => {
    const now = new Date("2024-06-15T15:00:00Z");
    vi.setSystemTime(now);
    const dateStr = "2024-06-15T12:00:00Z";
    const result = formatRelativeDate(dateStr, "ru");
    expect(result).toBe("3 часа назад");
  });

  it("returns hours ago in English", () => {
    const now = new Date("2024-06-15T15:00:00Z");
    vi.setSystemTime(now);
    const dateStr = "2024-06-15T12:00:00Z";
    const result = formatRelativeDate(dateStr, "en");
    expect(result).toBe("3 hours ago");
  });

  it("returns days ago in Russian", () => {
    const now = new Date("2024-06-20T12:00:00Z");
    vi.setSystemTime(now);
    const dateStr = "2024-06-18T12:00:00Z";
    const result = formatRelativeDate(dateStr, "ru");
    expect(result).toBe("2 дня назад");
  });

  it("returns formatted date for 7+ days ago", () => {
    const now = new Date("2024-06-25T12:00:00Z");
    vi.setSystemTime(now);
    const dateStr = "2024-06-15T12:00:00Z";
    const result = formatRelativeDate(dateStr, "en");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
  });

  it("defaults to Russian locale", () => {
    const now = new Date("2024-06-15T12:05:00Z");
    vi.setSystemTime(now);
    const dateStr = "2024-06-15T12:02:00Z";
    const result = formatRelativeDate(dateStr);
    expect(result).toBe("3 минуты назад");
  });

  it("returns 'just now' for future date", () => {
    const now = new Date("2024-06-15T12:00:00Z");
    vi.setSystemTime(now);
    const dateStr = "2024-06-15T12:05:00Z";
    const result = formatRelativeDate(dateStr, "ru");
    expect(result).toBe("только что");
  });

  it("handles Chinese locale", () => {
    const now = new Date("2024-06-15T12:05:00Z");
    vi.setSystemTime(now);
    const dateStr = "2024-06-15T12:02:00Z";
    const result = formatRelativeDate(dateStr, "zh");
    expect(result).toBe("3分钟前");
  });

  it("handles unknown locale by falling back to Russian", () => {
    const now = new Date("2024-06-15T12:05:00Z");
    vi.setSystemTime(now);
    const dateStr = "2024-06-15T12:02:00Z";
    const result = formatRelativeDate(dateStr, "unknown");
    expect(result).toBe("3 минуты назад");
  });

  it("Russian plural: '1 час назад'", () => {
    const now = new Date("2024-06-15T13:00:00Z");
    vi.setSystemTime(now);
    const dateStr = "2024-06-15T12:00:00Z";
    expect(formatRelativeDate(dateStr, "ru")).toBe("1 час назад");
  });

  it("Russian plural: '5 часов назад'", () => {
    const now = new Date("2024-06-15T17:00:00Z");
    vi.setSystemTime(now);
    const dateStr = "2024-06-15T12:00:00Z";
    expect(formatRelativeDate(dateStr, "ru")).toBe("5 часов назад");
  });

  it("Russian plural: '1 день назад'", () => {
    const now = new Date("2024-06-16T12:00:00Z");
    vi.setSystemTime(now);
    const dateStr = "2024-06-15T12:00:00Z";
    expect(formatRelativeDate(dateStr, "ru")).toBe("1 день назад");
  });
});
