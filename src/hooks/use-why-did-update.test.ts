import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWhyDidUpdate } from "./use-why-did-update";

describe("useWhyDidUpdate", () => {
  it("does not throw on render", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { rerender } = renderHook(
      ({ count }) => useWhyDidUpdate("Test", { count }),
      { initialProps: { count: 1 } }
    );
    rerender({ count: 2 });
    spy.mockRestore();
  });
});
