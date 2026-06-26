import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRenderCount } from "./use-render-count";

describe("useRenderCount", () => {
  it("returns 1 on first render", () => {
    const { result } = renderHook(() => useRenderCount());
    expect(result.current).toBe(1);
  });

  it("increments on re-render", () => {
    const { result, rerender } = renderHook(() => useRenderCount());
    rerender();
    expect(result.current).toBe(2);
    rerender();
    expect(result.current).toBe(3);
  });
});
