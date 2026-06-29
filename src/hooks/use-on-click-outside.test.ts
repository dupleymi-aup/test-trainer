import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useOnClickOutside } from "./use-on-click-outside";

function createRefWithElement() {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return { ref: { current: div } as React.RefObject<HTMLDivElement>, div };
}

describe("useOnClickOutside", () => {
  it("calls handler when clicking outside", () => {
    const { ref, div } = createRefWithElement();
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler));

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(div);
  });

  it("does not call handler when clicking inside", () => {
    const { ref, div } = createRefWithElement();
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler));

    act(() => {
      const event = new MouseEvent("mousedown", { bubbles: true });
      Object.defineProperty(event, "target", { value: div });
      div.dispatchEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  it("does not call handler when disabled", () => {
    const { ref, div } = createRefWithElement();
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler, false));

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  it("handles touchstart events", () => {
    const { ref, div } = createRefWithElement();
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler));

    act(() => {
      document.dispatchEvent(new TouchEvent("touchstart", { bubbles: true }));
    });

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(div);
  });

  it("cleans up event listeners on unmount", () => {
    const { ref, div } = createRefWithElement();
    const handler = vi.fn();
    const { unmount } = renderHook(() => useOnClickOutside(ref, handler));

    unmount();

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });
});
