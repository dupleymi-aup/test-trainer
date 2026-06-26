import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUpdate } from "./use-update";

describe("useUpdate", () => {
  it("returns a function", () => {
    const { result } = renderHook(() => useUpdate());
    expect(typeof result.current).toBe("function");
  });

  it("causes re-render when called", () => {
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useUpdate();
    });
    const initial = renderCount;
    act(() => {
      result.current();
    });
    expect(renderCount).toBeGreaterThan(initial);
  });
});
