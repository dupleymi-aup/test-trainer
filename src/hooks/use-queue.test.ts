import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQueue } from "./use-queue";

describe("useQueue", () => {
  it("initializes with items", () => {
    const { result } = renderHook(() => useQueue([1, 2, 3]));
    expect(result.current.size).toBe(3);
    expect(result.current.peek()).toBe(1);
  });

  it("enqueue adds items", () => {
    const { result } = renderHook(() => useQueue<number>());
    act(() => {
      result.current.enqueue(10, 20);
    });
    expect(result.current.size).toBe(2);
    expect(result.current.peek()).toBe(10);
  });

  it("dequeue removes first item", () => {
    const { result } = renderHook(() => useQueue([1, 2, 3]));
    let dequeued: number | undefined;
    act(() => {
      dequeued = result.current.dequeue();
    });
    expect(dequeued).toBe(1);
    expect(result.current.size).toBe(2);
    expect(result.current.peek()).toBe(2);
  });

  it("dequeue returns undefined on empty queue", () => {
    const { result } = renderHook(() => useQueue<number>());
    let dequeued: number | undefined;
    act(() => {
      dequeued = result.current.dequeue();
    });
    expect(dequeued).toBeUndefined();
  });

  it("clear empties queue", () => {
    const { result } = renderHook(() => useQueue([1, 2]));
    act(() => {
      result.current.clear();
    });
    expect(result.current.size).toBe(0);
    expect(result.current.peek()).toBeUndefined();
  });
});
