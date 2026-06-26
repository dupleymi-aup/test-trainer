import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRafLoop } from "./use-raf-loop";

describe("useRafLoop", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts and stops raf loop", () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const { unmount } = renderHook(() => useRafLoop(() => {}));
    expect(rafSpy).toHaveBeenCalled();

    unmount();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it("does not start loop when active=false", () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    renderHook(() => useRafLoop(() => {}, false));
    expect(rafSpy).not.toHaveBeenCalled();
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it("cleans up on unmount", () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);

    const { unmount } = renderHook(() => useRafLoop(() => {}));
    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(42);
  });
});
