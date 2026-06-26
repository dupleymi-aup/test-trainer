import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useLocalStorage } from "./use-local-storage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns initial value when localStorage is empty", () => {
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    expect(result.current[0]).toBe("default");
  });

  it("returns stored value from localStorage", () => {
    localStorage.setItem("key", JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    expect(result.current[0]).toBe("stored");
  });

  it("sets value to localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("key", "default"));

    act(() => {
      result.current[1]("new value");
    });

    expect(result.current[0]).toBe("new value");
    expect(JSON.parse(localStorage.getItem("key")!)).toBe("new value");
  });

  it("sets value using function updater", () => {
    const { result } = renderHook(() => useLocalStorage("count", 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
    expect(JSON.parse(localStorage.getItem("count")!)).toBe(1);
  });

  it("handles complex objects", () => {
    const { result } = renderHook(() => useLocalStorage("obj", { a: 1 } as Record<string, number>));

    act(() => {
      result.current[1]({ b: 2 } as Record<string, number>);
    });

    expect(result.current[0]).toEqual({ b: 2 });
    expect(JSON.parse(localStorage.getItem("obj")!)).toEqual({ b: 2 });
  });

  it("handles invalid JSON gracefully", () => {
    localStorage.setItem("key", "invalid json {{{");
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    expect(result.current[0]).toBe("default");
  });
});
