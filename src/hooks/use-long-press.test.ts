import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLongPress } from "./use-long-press";

describe("useLongPress", () => {
  it("calls onLongPress after delay", () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ delay: 500, onLongPress })
    );

    act(() => {
      result.current.onMouseDown({} as React.MouseEvent);
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("does not call onLongPress if released before delay", () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ delay: 500, onLongPress })
    );

    act(() => {
      result.current.onMouseDown({} as React.MouseEvent);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => {
      result.current.onMouseUp({} as React.MouseEvent);
    });

    expect(onLongPress).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("calls onRelease on short press", () => {
    const onRelease = vi.fn();
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ delay: 500, onLongPress, onRelease })
    );

    act(() => {
      result.current.onMouseDown({} as React.MouseEvent);
    });

    act(() => {
      result.current.onMouseUp({} as React.MouseEvent);
    });

    expect(onRelease).toHaveBeenCalledOnce();
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
