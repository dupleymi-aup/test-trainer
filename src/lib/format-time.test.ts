import { describe, it, expect } from "vitest";
import { formatDurationShort, formatDuration, formatTimer } from "./format-time";

describe("formatDurationShort", () => {
  it("formats seconds only", () => {
    expect(formatDurationShort(45)).toBe("45с");
  });

  it("formats minutes with remaining seconds", () => {
    expect(formatDurationShort(125)).toBe("2м 5с");
  });

  it("formats zero", () => {
    expect(formatDurationShort(0)).toBe("0с");
  });

  it("formats exact minute boundary", () => {
    expect(formatDurationShort(60)).toBe("1м");
  });
});

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("45с");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125)).toBe("2м 5с");
  });

  it("formats zero", () => {
    expect(formatDuration(0)).toBe("0с");
  });

  it("formats exact minute", () => {
    expect(formatDuration(60)).toBe("1м 0с");
  });

  it("formats large duration with hours", () => {
    expect(formatDuration(3661)).toBe("1ч 1м 1с");
  });

  it("formats exact hour", () => {
    expect(formatDuration(3600)).toBe("1ч 0м 0с");
  });
});

describe("formatTimer", () => {
  it("formats M:SS", () => {
    expect(formatTimer(65)).toBe("1:05");
  });

  it("formats zero seconds", () => {
    expect(formatTimer(0)).toBe("0:00");
  });

  it("formats H:MM:SS", () => {
    expect(formatTimer(3661)).toBe("1:01:01");
  });

  it("formats exact hour", () => {
    expect(formatTimer(3600)).toBe("1:00:00");
  });

  it("pads single digit seconds", () => {
    expect(formatTimer(61)).toBe("1:01");
  });
});
