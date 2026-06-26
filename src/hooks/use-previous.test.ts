import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { usePrevious } from "./use-previous";

describe("usePrevious", () => {
  it("returns undefined on first render", () => {
    const { result } = renderHook(() => usePrevious("value"));
    expect(result.current).toBeUndefined();
  });

  it("returns previous value after update", () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: "first" } }
    );

    expect(result.current).toBeUndefined();

    rerender({ value: "second" });
    expect(result.current).toBe("first");

    rerender({ value: "third" });
    expect(result.current).toBe("second");
  });

  it("handles number values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: 1 } }
    );

    rerender({ value: 2 });
    expect(result.current).toBe(1);

    rerender({ value: 3 });
    expect(result.current).toBe(2);
  });

  it("handles object values", () => {
    const obj1 = { a: 1 };
    const obj2 = { b: 2 };

    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: obj1 } }
    );

    rerender({ value: obj2 });
    expect(result.current).toBe(obj1);
  });
});
