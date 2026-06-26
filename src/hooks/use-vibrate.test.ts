import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useVibrate } from "./use-vibrate";

describe("useVibrate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports isSupported=false when navigator.vibrate unavailable", () => {
    const { result } = renderHook(() => useVibrate());
    expect(result.current.isSupported).toBe(false);
  });

  it("vibrate returns false when unsupported", () => {
    const { result } = renderHook(() => useVibrate());
    expect(result.current.vibrate(100)).toBe(false);
  });

  it("stop returns false when unsupported", () => {
    const { result } = renderHook(() => useVibrate());
    expect(result.current.stop()).toBe(false);
  });
});
