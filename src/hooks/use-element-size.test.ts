import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useElementSize } from "./use-element-size";

describe("useElementSize", () => {
  it("returns ref function and initial size 0", () => {
    const { result } = renderHook(() => useElementSize());
    expect(typeof result.current.ref).toBe("function");
    expect(result.current.width).toBe(0);
    expect(result.current.height).toBe(0);
  });
});
