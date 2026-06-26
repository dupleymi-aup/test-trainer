import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSafeState } from "./use-safe-state";

describe("useSafeState", () => {
  it("returns initial value", () => {
    const { result } = renderHook(() => useSafeState("hello"));
    expect(result.current[0]).toBe("hello");
  });

  it("updates state", () => {
    const { result } = renderHook(() => useSafeState(0));
    act(() => {
      result.current[1](5);
    });
    expect(result.current[0]).toBe(5);
  });

  it("supports functional update", () => {
    const { result } = renderHook(() => useSafeState(10));
    act(() => {
      result.current[1]((prev) => prev + 5);
    });
    expect(result.current[0]).toBe(15);
  });

  it("does not throw after unmount", () => {
    const { result, unmount } = renderHook(() => useSafeState(0));
    unmount();
    expect(() => {
      act(() => {
        result.current[1](1);
      });
    }).not.toThrow();
  });
});
