import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useClickAnyWhere } from "./use-click-any-where";

describe("useClickAnyWhere", () => {
  it("calls handler on click", () => {
    const handler = vi.fn();
    renderHook(() => useClickAnyWhere(handler));
    document.body.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("cleans up listener on unmount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useClickAnyWhere(handler));
    unmount();
    document.body.click();
    expect(handler).not.toHaveBeenCalled();
  });
});
