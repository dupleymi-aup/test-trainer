import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useCounter } from "./use-counter";

describe("useCounter", () => {
  it("returns 0 by default", () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it("returns initial value when provided", () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it("increments count", () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it("decrements count", () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(9);
  });

  it("resets count to initial value", () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.increment();
      result.current.increment();
    });

    expect(result.current.count).toBe(7);

    act(() => {
      result.current.reset();
    });

    expect(result.current.count).toBe(5);
  });

  it("sets count directly", () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.set(42);
    });

    expect(result.current.count).toBe(42);
  });

  it("respects min boundary", () => {
    const { result } = renderHook(() => useCounter(5, { min: 0 }));

    act(() => {
      result.current.decrement();
      result.current.decrement();
      result.current.decrement();
      result.current.decrement();
      result.current.decrement();
      result.current.decrement();
    });

    expect(result.current.count).toBe(0);
  });

  it("respects max boundary", () => {
    const { result } = renderHook(() => useCounter(5, { max: 10 }));

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.increment();
      result.current.increment();
      result.current.increment();
      result.current.increment();
    });

    expect(result.current.count).toBe(10);
  });

  it("uses custom step", () => {
    const { result } = renderHook(() => useCounter(0, { step: 5 }));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(5);

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(0);
  });

  it("clamps set value to min/max", () => {
    const { result } = renderHook(() => useCounter(5, { min: 0, max: 10 }));

    act(() => {
      result.current.set(15);
    });

    expect(result.current.count).toBe(10);

    act(() => {
      result.current.set(-5);
    });

    expect(result.current.count).toBe(0);
  });
});
