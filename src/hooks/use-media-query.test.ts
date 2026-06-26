import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useMediaQuery } from "./use-media-query";

describe("useMediaQuery", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false when media query does not match", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
  });

  it("returns true when media query matches", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);
  });

  it("updates when media query changes", () => {
    let listener: ((e: MediaQueryListEvent) => void) | undefined;
    const addEventListener = vi.fn((_, cb) => { listener = cb; });
    const removeEventListener = vi.fn();

    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener,
      removeEventListener,
    })));

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);

    act(() => {
      listener?.({ matches: true } as MediaQueryListEvent);
    });

    expect(result.current).toBe(true);
  });

  it("cleans up event listener on unmount", () => {
    const removeEventListener = vi.fn();
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener,
    })));

    const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    unmount();

    expect(removeEventListener).toHaveBeenCalled();
  });
});
