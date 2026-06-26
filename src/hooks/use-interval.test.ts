import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useInterval } from "./use-interval";

describe("useInterval", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls callback at specified interval", () => {
    const callback = vi.fn();
    renderHook(() => useInterval(callback, 100));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("does not call callback when delay is null", () => {
    const callback = vi.fn();
    renderHook(() => useInterval(callback, null));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("clears interval on unmount", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useInterval(callback, 100));

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("updates callback without restarting interval", () => {
    let count = 0;
    const callback1 = vi.fn(() => { count = 1; });
    const callback2 = vi.fn(() => { count = 2; });

    const { rerender } = renderHook(
      ({ cb }) => useInterval(cb, 100),
      { initialProps: { cb: callback1 } }
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(count).toBe(1);

    rerender({ cb: callback2 });

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(count).toBe(2);
  });

  it("stops calling when delay changes to null", () => {
    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ delay }) => useInterval(callback, delay),
      { initialProps: { delay: 100 as number | null } }
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(callback).toHaveBeenCalledTimes(3);

    rerender({ delay: null });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(callback).toHaveBeenCalledTimes(3);
  });
});
