import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useThrottle } from "./use-throttle";

describe("useThrottle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useThrottle("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("throttles rapid updates", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: "c" });

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe("c");
    vi.useRealTimers();
  });
});
