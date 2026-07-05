import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useImmerMap } from "./use-immer-map";

describe("useImmerMap", () => {
  it("initializes with entries", () => {
    const { result } = renderHook(() => useImmerMap([["a", 1], ["b", 2]]));
    expect(result.current.get("a")).toBe(1);
    expect(result.current.has("b")).toBe(true);
  });

  it("initializes empty when no entries given", () => {
    const { result } = renderHook(() => useImmerMap<string, number>());
    expect(result.current.map.size).toBe(0);
    expect(result.current.has("x")).toBe(false);
    expect(result.current.get("x")).toBeUndefined();
  });

  it("set adds entry", () => {
    const { result } = renderHook(() => useImmerMap<string, number>());
    act(() => { result.current.set("x", 10); });
    expect(result.current.get("x")).toBe(10);
  });

  it("set overwrites existing entry", () => {
    const { result } = renderHook(() => useImmerMap([["x", 1]]));
    act(() => { result.current.set("x", 99); });
    expect(result.current.get("x")).toBe(99);
  });

  it("update modifies existing value", () => {
    const { result } = renderHook(() => useImmerMap([["count", 5]]));
    act(() => { result.current.update("count", (n) => n + 3); });
    expect(result.current.get("count")).toBe(8);
  });

  it("update does nothing for non-existent key", () => {
    const { result } = renderHook(() => useImmerMap<string, number>());
    act(() => { result.current.update("missing", (n) => n + 1); });
    expect(result.current.has("missing")).toBe(false);
  });

  it("update with nested objects", () => {
    const { result } = renderHook(() =>
      useImmerMap<string, { x: number; y: number }>([["point", { x: 1, y: 2 }]])
    );
    act(() => {
      result.current.update("point", (p) => ({ ...p, x: p.x + 1 }));
    });
    expect(result.current.get("point")).toEqual({ x: 2, y: 2 });
  });

  it("remove deletes entry", () => {
    const { result } = renderHook(() => useImmerMap([["k", 1]]));
    act(() => { result.current.remove("k"); });
    expect(result.current.has("k")).toBe(false);
  });

  it("remove non-existent key is a no-op", () => {
    const { result } = renderHook(() => useImmerMap([["a", 1]]));
    act(() => { result.current.remove("b"); });
    expect(result.current.has("a")).toBe(true);
    expect(result.current.map.size).toBe(1);
  });

  it("clear empties map", () => {
    const { result } = renderHook(() => useImmerMap([["a", 1], ["b", 2]]));
    act(() => { result.current.clear(); });
    expect(result.current.map.size).toBe(0);
    expect(result.current.has("a")).toBe(false);
  });

  it("chained operations work correctly", () => {
    const { result } = renderHook(() => useImmerMap<string, number>());
    act(() => { result.current.set("a", 1); });
    act(() => { result.current.set("b", 2); });
    act(() => { result.current.update("a", (v) => v + 10); });
    act(() => { result.current.remove("b"); });
    expect(result.current.get("a")).toBe(11);
    expect(result.current.has("b")).toBe(false);
    expect(result.current.map.size).toBe(1);
  });

  it("get and has have stable references", () => {
    const { result, rerender } = renderHook(() => useImmerMap<string, number>([["a", 1]]));
    const firstGet = result.current.get;
    const firstHas = result.current.has;
    rerender();
    expect(result.current.get).toBe(firstGet);
    expect(result.current.has).toBe(firstHas);
  });
});
