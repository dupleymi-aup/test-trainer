import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMap } from "./use-map";

describe("useMap", () => {
  it("initializes with entries", () => {
    const { result } = renderHook(() => useMap([["a", 1], ["b", 2]]));
    expect(result.current.get("a")).toBe(1);
    expect(result.current.has("b")).toBe(true);
  });

  it("set adds entry", () => {
    const { result } = renderHook(() => useMap<string, number>());
    act(() => {
      result.current.set("x", 10);
    });
    expect(result.current.get("x")).toBe(10);
    expect(result.current.has("x")).toBe(true);
  });

  it("remove deletes entry", () => {
    const { result } = renderHook(() => useMap([["k", 1]]));
    act(() => {
      result.current.remove("k");
    });
    expect(result.current.has("k")).toBe(false);
  });

  it("clear removes all entries", () => {
    const { result } = renderHook(() => useMap([["a", 1], ["b", 2]]));
    act(() => {
      result.current.clear();
    });
    expect(result.current.map.size).toBe(0);
  });
});
