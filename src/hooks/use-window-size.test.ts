import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useWindowSize } from "./use-window-size";

describe("useWindowSize", () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);
  });

  afterEach(() => {
    vi.stubGlobal("innerWidth", originalInnerWidth);
    vi.stubGlobal("innerHeight", originalInnerHeight);
  });

  it("returns initial window size", () => {
    const { result } = renderHook(() => useWindowSize());
    expect(result.current).toEqual({ width: 1024, height: 768 });
  });

  it("updates on resize", () => {
    const { result } = renderHook(() => useWindowSize());

    act(() => {
      vi.stubGlobal("innerWidth", 800);
      vi.stubGlobal("innerHeight", 600);
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toEqual({ width: 800, height: 600 });
  });

  it("cleans up resize listener on unmount", () => {
    const { unmount } = renderHook(() => useWindowSize());
    const removeSpy = vi.spyOn(window, "removeEventListener");

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
