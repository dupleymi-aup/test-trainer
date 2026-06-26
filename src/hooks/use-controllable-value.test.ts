import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useControllableValue } from "./use-controllable-value";

describe("useControllableValue", () => {
  it("uses defaultValue in uncontrolled mode", () => {
    const { result } = renderHook(() =>
      useControllableValue({ defaultValue: "initial" })
    );
    expect(result.current.value).toBe("initial");
    expect(result.current.isControlled).toBe(false);
  });

  it("updates value via setValue", () => {
    const { result } = renderHook(() =>
      useControllableValue({ defaultValue: "old" })
    );
    act(() => {
      result.current.setValue("new");
    });
    expect(result.current.value).toBe("new");
  });

  it("supports functional update", () => {
    const { result } = renderHook(() =>
      useControllableValue({ defaultValue: 1 })
    );
    act(() => {
      result.current.setValue((prev) => prev + 1);
    });
    expect(result.current.value).toBe(2);
  });

  it("uses controlled value when provided", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useControllableValue({ value: v }),
      { initialProps: { v: "controlled" } }
    );
    expect(result.current.value).toBe("controlled");
    expect(result.current.isControlled).toBe(true);
    rerender({ v: "updated" });
    expect(result.current.value).toBe("updated");
  });

  it("calls onChange", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableValue({ defaultValue: "init", onChange })
    );
    act(() => {
      result.current.setValue("changed");
    });
    expect(onChange).toHaveBeenCalledWith("changed");
  });
});
