import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTextSelection } from "./use-text-selection";

describe("useTextSelection", () => {
  it("returns empty selection by default", () => {
    const { result } = renderHook(() => useTextSelection());
    expect(result.current.text).toBe("");
    expect(result.current.x).toBe(0);
    expect(result.current.y).toBe(0);
    expect(result.current.width).toBe(0);
    expect(result.current.height).toBe(0);
  });
});
