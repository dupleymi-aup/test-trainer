import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useForkRef } from "./use-fork-ref";

describe("useForkRef", () => {
  it("returns a function", () => {
    const { result } = renderHook(() => useForkRef(null, null));
    expect(typeof result.current).toBe("function");
  });

  it("calls callback ref when invoked", () => {
    let received: HTMLDivElement | null = null;
    const callbackRef = (node: HTMLDivElement | null) => { received = node; };
    const { result } = renderHook(() => useForkRef(callbackRef, null));
    const mockNode = document.createElement("div");
    result.current(mockNode);
    expect(received).toBe(mockNode);
  });

  it("sets object ref when invoked", () => {
    const objectRef = { current: null };
    const { result } = renderHook(() => useForkRef(null, objectRef));
    const mockNode = document.createElement("span");
    result.current(mockNode);
    expect(objectRef.current).toBe(mockNode);
  });
});
