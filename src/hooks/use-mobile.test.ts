import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "./use-mobile";

describe("useIsMobile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false on desktop viewport", () => {
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
      innerWidth: 1024,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true on mobile viewport", () => {
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
      innerWidth: 375,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("updates when viewport changes", () => {
    let matches = false;
    const listeners: Array<() => void> = [];
    const mql = {
      get matches() { return matches; },
      addEventListener: (_: string, fn: () => void) => { listeners.push(fn); },
      removeEventListener: vi.fn(),
    };

    vi.stubGlobal("window", {
      matchMedia: () => mql,
      innerWidth: 1024,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    matches = true;
    act(() => {
      listeners.forEach((fn) => fn());
    });
    expect(result.current).toBe(true);
  });

  it("cleans up event listener on unmount", () => {
    const removeEventListener = vi.fn();
    vi.stubGlobal("window", {
      matchMedia: () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener,
      }),
      innerWidth: 1024,
    });

    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    expect(removeEventListener).toHaveBeenCalled();
  });
});
