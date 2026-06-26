import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUnmount } from "./use-unmount";

describe("useUnmount", () => {
  it("calls callback on unmount", () => {
    const fn = vi.fn();
    const { unmount } = renderHook(() => useUnmount(fn));
    unmount();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("does not call callback on mount", () => {
    const fn = vi.fn();
    renderHook(() => useUnmount(fn));
    expect(fn).not.toHaveBeenCalled();
  });
});
