import { describe, it, expect } from "vitest";
import {
  MS_PER_SECOND,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  MS_PER_WEEK,
  API_TIMEOUT_MS,
} from "./time-constants";

describe("time constants", () => {
  it("MS_PER_SECOND is 1000", () => {
    expect(MS_PER_SECOND).toBe(1000);
  });

  it("MS_PER_MINUTE is 60000", () => {
    expect(MS_PER_MINUTE).toBe(60000);
  });

  it("MS_PER_HOUR is 3600000", () => {
    expect(MS_PER_HOUR).toBe(3600000);
  });

  it("MS_PER_DAY is 86400000", () => {
    expect(MS_PER_DAY).toBe(86400000);
  });

  it("MS_PER_WEEK is 604800000", () => {
    expect(MS_PER_WEEK).toBe(604800000);
  });

  it("API_TIMEOUT_MS is 10 seconds", () => {
    expect(API_TIMEOUT_MS).toBe(10000);
  });

  it("correct ratios between units", () => {
    expect(MS_PER_MINUTE / MS_PER_SECOND).toBe(60);
    expect(MS_PER_HOUR / MS_PER_MINUTE).toBe(60);
    expect(MS_PER_DAY / MS_PER_HOUR).toBe(24);
    expect(MS_PER_WEEK / MS_PER_DAY).toBe(7);
  });
});
