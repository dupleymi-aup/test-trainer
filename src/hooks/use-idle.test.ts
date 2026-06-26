import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIdle } from "./use-idle";

describe("useIdle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false initially", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useIdle({ timeout: 1000 }));
    expect(result.current).toBe(false);
    vi.useRealTimers();
  });

  it("becomes idle after timeout", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useIdle({ timeout: 500 }));
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe(true);
    vi.useRealTimers();
  });

  it("resets on user activity", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useIdle({ timeout: 500 }));
    act(() => { vi.advanceTimersByTime(300); });
    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current).toBe(false);
    vi.useRealTimers();
  });
});
