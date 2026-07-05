import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useElementSize } from "./use-element-size";

describe("useElementSize", () => {
  let resizeCallback: (entries: { contentRect: { width: number; height: number } }[]) => void;
  let disconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    disconnect = vi.fn();
    const MockObserver = vi.fn((callback: typeof resizeCallback) => {
      resizeCallback = callback;
      return { observe: vi.fn(), disconnect, unobserve: vi.fn() };
    });
    vi.stubGlobal("ResizeObserver", MockObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns ref function and initial size 0", () => {
    const { result } = renderHook(() => useElementSize());
    expect(typeof result.current.ref).toBe("function");
    expect(result.current.width).toBe(0);
    expect(result.current.height).toBe(0);
  });

  it("updates size when resize callback fires", () => {
    const { result } = renderHook(() => useElementSize());
    const div = document.createElement("div");

    act(() => {
      result.current.ref(div);
    });

    act(() => {
      resizeCallback([{ contentRect: { width: 200, height: 100 } }]);
    });

    expect(result.current.width).toBe(200);
    expect(result.current.height).toBe(100);
  });

  it("resets size when ref is called with null", () => {
    const { result } = renderHook(() => useElementSize());
    const div = document.createElement("div");

    act(() => {
      result.current.ref(div);
    });

    act(() => {
      result.current.ref(null);
    });

    expect(result.current.width).toBe(0);
    expect(result.current.height).toBe(0);
  });

  it("disconnects previous observer when ref changes", () => {
    const { result } = renderHook(() => useElementSize());
    const div1 = document.createElement("div");
    const div2 = document.createElement("div");

    act(() => {
      result.current.ref(div1);
    });

    act(() => {
      result.current.ref(div2);
    });

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("cleans up observer on unmount", () => {
    const { result, unmount } = renderHook(() => useElementSize());
    const div = document.createElement("div");

    act(() => {
      result.current.ref(div);
    });

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("rounds width and height to integers", () => {
    const { result } = renderHook(() => useElementSize());
    const div = document.createElement("div");

    act(() => {
      result.current.ref(div);
    });

    act(() => {
      resizeCallback([{ contentRect: { width: 200.7, height: 100.3 } }]);
    });

    expect(result.current.width).toBe(201);
    expect(result.current.height).toBe(100);
  });
});
