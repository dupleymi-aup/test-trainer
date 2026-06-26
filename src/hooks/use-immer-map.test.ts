import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useImmerMap } from "./use-immer-map";

describe("useImmerMap", () => {
  it("initializes with entries", () => {
    const { result } = renderHook(() => useImmerMap([["a", 1], ["b", 2]]));
    expect(result.current.get("a")).toBe(1);
    expect(result.current.has("b")).toBe(true);
  });

  it("set adds entry", () => {
    const { result } = renderHook(() => useImmerMap<string, number>());
    act(() => { result.current.set("x", 10); });
    expect(result.current.get("x")).toBe(10);
  });

  it("update modifies existing value", () => {
    const { result } = renderHook(() => useImmerMap([["count", 5]]));
    act(() => { result.current.update("count", (n) => n + 3); });
    expect(result.current.get("count")).toBe(8);
  });

  it("remove deletes entry", () => {
    const { result } = renderHook(() => useImmerMap([["k", 1]]));
    act(() => { result.current.remove("k"); });
    expect(result.current.has("k")).toBe(false);
  });

  it("clear empties map", () => {
    const { result } = renderHook(() => useImmerMap([["a", 1], ["b", 2]]));
    act(() => { result.current.clear(); });
    expect(result.current.map.size).toBe(0);
  });
});
