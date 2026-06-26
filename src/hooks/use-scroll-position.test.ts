import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useScrollPosition } from "./use-scroll-position";

describe("useScrollPosition", () => {
  it("returns initial position {0,0}", () => {
    const { result } = renderHook(() => useScrollPosition());
    expect(result.current).toEqual({ x: 0, y: 0 });
  });

  it("returns an object with x and y", () => {
    const { result } = renderHook(() => useScrollPosition());
    expect(typeof result.current.x).toBe("number");
    expect(typeof result.current.y).toBe("number");
  });
});
