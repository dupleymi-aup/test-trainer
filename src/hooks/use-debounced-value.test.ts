import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "./use-debounced-value";

describe("useDebouncedValue", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("hello", 300));
    expect(result.current.debouncedValue).toBe("hello");
  });

  it("debounces value updates", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    expect(result.current.debouncedValue).toBe("a");

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.debouncedValue).toBe("b");
    vi.useRealTimers();
  });

  it("cancel stops pending update", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    act(() => { result.current.cancel(); });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.debouncedValue).toBe("a");
    vi.useRealTimers();
  });
});
