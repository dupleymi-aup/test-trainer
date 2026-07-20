import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "./use-local-storage";

// Mock localStorage
function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((n: number) => {
      const keys = Object.keys(store);
      return keys[n] ?? null;
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
  };
}

describe("useLocalStorage", () => {
  let mockStorage: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    mockStorage = createLocalStorageMock();
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("initializes with initialValue when localStorage is empty", () => {
    mockStorage.getItem.mockReturnValue(null);
    const { result } = renderHook(() => useLocalStorage("test-key", { count: 0 }));
    expect(result.current.value).toEqual({ count: 0 });
  });

  it("loads from localStorage on mount", () => {
    const savedValue = { count: 42 };
    mockStorage.getItem.mockReturnValue(JSON.stringify(savedValue));
    const { result } = renderHook(() => useLocalStorage("test-key", { count: 0 }));
    expect(result.current.value).toEqual(savedValue);
    expect(mockStorage.getItem).toHaveBeenCalledWith("test-key");
  });

  it("saves to localStorage when setValue is called", () => {
    mockStorage.getItem.mockReturnValue(null);
    const { result } = renderHook(() => useLocalStorage("test-key", { count: 0 }));

    act(() => {
      result.current.setValue({ count: 10 });
    });

    // SetValue sets isPending immediately
    expect(result.current.value).toEqual({ count: 10 });

    // Advance timers to trigger the debounced write
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockStorage.setItem).toHaveBeenCalledWith("test-key", JSON.stringify({ count: 10 }));
  });

  it("supports function updater", () => {
    mockStorage.getItem.mockReturnValue(JSON.stringify({ count: 5 }));
    const { result } = renderHook(() => useLocalStorage("test-key", { count: 0 }));

    act(() => {
      result.current.setValue((prev) => ({ count: prev.count + 1 }));
    });

    expect(result.current.value).toEqual({ count: 6 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockStorage.setItem).toHaveBeenCalledWith("test-key", JSON.stringify({ count: 6 }));
  });

  it("removes item from localStorage", () => {
    mockStorage.getItem.mockReturnValue(JSON.stringify({ count: 5 }));
    const { result } = renderHook(() => useLocalStorage("test-key", { count: 0 }));

    expect(result.current.value).toEqual({ count: 5 });

    act(() => {
      result.current.remove();
    });

    expect(mockStorage.removeItem).toHaveBeenCalledWith("test-key");
    expect(result.current.value).toEqual({ count: 0 });
  });

  it("clear is alias for remove", () => {
    mockStorage.getItem.mockReturnValue(JSON.stringify({ count: 5 }));
    const { result } = renderHook(() => useLocalStorage("test-key", { count: 0 }));

    act(() => {
      result.current.clear();
    });

    expect(mockStorage.removeItem).toHaveBeenCalledWith("test-key");
  });

  it("handles corrupted JSON gracefully", () => {
    mockStorage.getItem.mockReturnValue("not-valid-json");
    const { result } = renderHook(() => useLocalStorage("test-key", { default: true }));
    expect(result.current.value).toEqual({ default: true });
  });

  it("debounces rapid setValue calls", () => {
    mockStorage.getItem.mockReturnValue(null);
    const { result } = renderHook(() => useLocalStorage("test-key", 0));

    act(() => {
      result.current.setValue(1);
      result.current.setValue(2);
      result.current.setValue(3);
    });

    // Only the last value should be written
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
    expect(mockStorage.setItem).toHaveBeenCalledWith("test-key", JSON.stringify(3));
  });

  it("handles non-object initial values (strings, numbers)", () => {
    mockStorage.getItem.mockReturnValue(null);
    const { result: r1 } = renderHook(() => useLocalStorage("str-key", "hello"));
    expect(r1.current.value).toBe("hello");

    const { result: r2 } = renderHook(() => useLocalStorage("num-key", 42));
    expect(r2.current.value).toBe(42);

    const { result: r3 } = renderHook(() => useLocalStorage("bool-key", true));
    expect(r3.current.value).toBe(true);
  });

  it("persists string values correctly", () => {
    mockStorage.getItem.mockReturnValue(null);
    const { result } = renderHook(() => useLocalStorage("str-key", ""));

    act(() => {
      result.current.setValue("test-value");
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockStorage.setItem).toHaveBeenCalledWith("str-key", JSON.stringify("test-value"));
  });
});
