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

  it("uses default timeout of 60s", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useIdle());
    act(() => { vi.advanceTimersByTime(59_999); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe(true);
    vi.useRealTimers();
  });

  it("resets on keyboard activity", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useIdle({ timeout: 500 }));
    act(() => { vi.advanceTimersByTime(499); });
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe(true);
    vi.useRealTimers();
  });

  it("resets on mouse move", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useIdle({ timeout: 500 }));
    act(() => { vi.advanceTimersByTime(300); });
    act(() => {
      document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe(false);
    vi.useRealTimers();
  });

  it("does not trigger on unknown events", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useIdle({ timeout: 500 }));
    act(() => {
      document.dispatchEvent(new Event("custom-event"));
    });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe(true);
    vi.useRealTimers();
  });

  it("stays not idle with continuous activity", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useIdle({ timeout: 200 }));
    for (let i = 0; i < 10; i++) {
      act(() => { vi.advanceTimersByTime(100); });
      act(() => {
        document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      });
    }
    expect(result.current).toBe(false);
    vi.useRealTimers();
  });

  it("cleans up listeners on unmount", () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useIdle({ timeout: 500 }));
    unmount();
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe(false);
    vi.useRealTimers();
  });

  it("resets on scroll event", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useIdle({ timeout: 500 }));
    act(() => { vi.advanceTimersByTime(400); });
    act(() => {
      document.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    act(() => { vi.advanceTimersByTime(499); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe(true);
    vi.useRealTimers();
  });
});
