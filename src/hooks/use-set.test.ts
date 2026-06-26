import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSet } from "./use-set";

describe("useSet", () => {
  it("initializes with values", () => {
    const { result } = renderHook(() => useSet([1, 2, 3]));
    expect(result.current.has(1)).toBe(true);
    expect(result.current.has(3)).toBe(true);
  });

  it("add inserts value", () => {
    const { result } = renderHook(() => useSet<number>());
    act(() => {
      result.current.add(5);
    });
    expect(result.current.has(5)).toBe(true);
    expect(result.current.set.size).toBe(1);
  });

  it("add does not duplicate", () => {
    const { result } = renderHook(() => useSet([1]));
    act(() => {
      result.current.add(1);
    });
    expect(result.current.set.size).toBe(1);
  });

  it("remove deletes value", () => {
    const { result } = renderHook(() => useSet([1, 2]));
    act(() => {
      result.current.remove(1);
    });
    expect(result.current.has(1)).toBe(false);
    expect(result.current.set.size).toBe(1);
  });

  it("clear empties set", () => {
    const { result } = renderHook(() => useSet([1, 2, 3]));
    act(() => {
      result.current.clear();
    });
    expect(result.current.set.size).toBe(0);
  });
});
