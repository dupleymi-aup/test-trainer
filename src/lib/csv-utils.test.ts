import { describe, it, expect } from "vitest";
import { sanitizeCSVValue, sanitizeFilename } from "./csv-utils";

describe("sanitizeCSVValue", () => {
  it("returns plain text unchanged", () => {
    expect(sanitizeCSVValue("hello")).toBe("hello");
  });

  it("escapes double quotes per RFC 4180", () => {
    expect(sanitizeCSVValue('say "hello"')).toBe('say ""hello""');
  });

  it("prefixes formula-triggering = with single quote", () => {
    expect(sanitizeCSVValue('=cmd|\'/etc/passwd')).toBe("'=cmd|'/etc/passwd");
  });

  it("prefixes formula-triggering + with single quote", () => {
    expect(sanitizeCSVValue("+cmd")).toBe("'+cmd");
  });

  it("prefixes formula-triggering - with single quote", () => {
    expect(sanitizeCSVValue("-cmd")).toBe("'-cmd");
  });

  it("prefixes formula-triggering @ with single quote", () => {
    expect(sanitizeCSVValue("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("detects whitespace-prefixed formula attempts", () => {
    expect(sanitizeCSVValue(" =cmd")).toBe("' =cmd");
  });

  it("handles empty string", () => {
    expect(sanitizeCSVValue("")).toBe("");
  });

  it("handles unicode content", () => {
    expect(sanitizeCSVValue("Привет мир")).toBe("Привет мир");
  });
});

describe("sanitizeFilename", () => {
  it("returns safe filename unchanged", () => {
    expect(sanitizeFilename("report")).toBe("report");
  });

  it("replaces spaces with hyphens", () => {
    expect(sanitizeFilename("my report")).toBe("my-report");
  });

  it("removes unsafe characters", () => {
    expect(sanitizeFilename('file/name:test')).toBe("filenametest");
  });

  it("truncates to 60 characters", () => {
    const long = "a".repeat(100);
    expect(sanitizeFilename(long)).toHaveLength(60);
  });

  it("returns 'unnamed' for empty input", () => {
    expect(sanitizeFilename("")).toBe("unnamed");
  });

  it("handles Cyrillic characters", () => {
    expect(sanitizeFilename("Отчёт 2024")).toBe("Отчёт-2024");
  });
});
