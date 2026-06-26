import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMergeState } from "./use-merge-state";

describe("useMergeState", () => {
  it("returns initial state", () => {
    const { result } = renderHook(() =>
      useMergeState({ a: 1, b: "hello" })
    );
    expect(result.current[0]).toEqual({ a: 1, b: "hello" });
  });

  it("merges object patch", () => {
    const { result } = renderHook(() =>
      useMergeState({ a: 1, b: 2, c: 3 })
    );
    act(() => {
      result.current[1]({ b: 99 });
    });
    expect(result.current[0]).toEqual({ a: 1, b: 99, c: 3 });
  });

  it("merges via functional update", () => {
    const { result } = renderHook(() =>
      useMergeState({ x: 10 })
    );
    act(() => {
      result.current[1]((prev) => ({ x: (prev.x as number) + 5 }));
    });
    expect(result.current[0]).toEqual({ x: 15 });
  });
});
