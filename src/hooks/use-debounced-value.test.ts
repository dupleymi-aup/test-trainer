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

  it("isPending is false initially", () => {
    const { result } = renderHook(() => useDebouncedValue("hello", 300));
    expect(result.current.isPending).toBe(false);
  });

  it("debounces value updates", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    expect(result.current.debouncedValue).toBe("a");
    expect(result.current.isPending).toBe(true);

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.debouncedValue).toBe("b");
    expect(result.current.isPending).toBe(false);
    vi.useRealTimers();
  });

  it("rapid value changes only fire last update", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    rerender({ value: "c" });
    rerender({ value: "d" });

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.debouncedValue).toBe("d");
    vi.useRealTimers();
  });

  it("returns to initial value after rapid change back", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    expect(result.current.isPending).toBe(true);

    rerender({ value: "a" });
    expect(result.current.isPending).toBe(false);
    expect(result.current.debouncedValue).toBe("a");

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.debouncedValue).toBe("a");
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
    expect(result.current.isPending).toBe(false);
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.debouncedValue).toBe("a");
    vi.useRealTimers();
  });

  it("cancel does not prevent future updates", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    act(() => { result.current.cancel(); });

    rerender({ value: "c" });
    expect(result.current.isPending).toBe(true);

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.debouncedValue).toBe("c");
    vi.useRealTimers();
  });

  it("uses default delay of 300ms", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current.debouncedValue).toBe("a");

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.debouncedValue).toBe("b");
    vi.useRealTimers();
  });

  it("cleans up timer on unmount", () => {
    vi.useFakeTimers();
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    unmount();

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.debouncedValue).toBe("a");
    vi.useRealTimers();
  });

  it("isPending reflects correct state through lifecycle", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 200),
      { initialProps: { value: "x" } }
    );

    expect(result.current.isPending).toBe(false);

    rerender({ value: "y" });
    expect(result.current.isPending).toBe(true);

    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current.isPending).toBe(false);
    expect(result.current.debouncedValue).toBe("y");

    rerender({ value: "z" });
    expect(result.current.isPending).toBe(true);

    act(() => { result.current.cancel(); });
    expect(result.current.isPending).toBe(false);
    expect(result.current.debouncedValue).toBe("y");
    vi.useRealTimers();
  });
});
