import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useToggle } from "./use-toggle";

describe("useToggle", () => {
  it("returns false by default", () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current[0]).toBe(false);
  });

  it("returns initial value when provided", () => {
    const { result } = renderHook(() => useToggle(true));
    expect(result.current[0]).toBe(true);
  });

  it("toggles value", () => {
    const { result } = renderHook(() => useToggle(false));

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(false);
  });

  it("sets value directly", () => {
    const { result } = renderHook(() => useToggle(false));

    act(() => {
      result.current[2](true);
    });

    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[2](false);
    });

    expect(result.current[0]).toBe(false);
  });

  it("provides stable function references", () => {
    const { result, rerender } = renderHook(() => useToggle());

    const toggle = result.current[1];
    const set = result.current[2];

    rerender();

    expect(result.current[1]).toBe(toggle);
    expect(result.current[2]).toBe(set);
  });
});
