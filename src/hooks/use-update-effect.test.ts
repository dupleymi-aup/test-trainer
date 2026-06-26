import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUpdateEffect } from "./use-update-effect";

describe("useUpdateEffect", () => {
  it("does not run on first render", () => {
    const effect = vi.fn();
    renderHook(() => useUpdateEffect(effect, []));
    expect(effect).not.toHaveBeenCalled();
  });

  it("runs on subsequent updates", () => {
    const effect = vi.fn();
    const { rerender } = renderHook(
      ({ dep }) => useUpdateEffect(effect, [dep]),
      { initialProps: { dep: 1 } }
    );
    rerender({ dep: 2 });
    expect(effect).toHaveBeenCalledOnce();
  });

  it("does not run when deps unchanged", () => {
    const effect = vi.fn();
    const { rerender } = renderHook(
      ({ dep }) => useUpdateEffect(effect, [dep]),
      { initialProps: { dep: 1 } }
    );
    rerender({ dep: 1 });
    expect(effect).not.toHaveBeenCalled();
  });
});
