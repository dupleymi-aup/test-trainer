import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDocumentTitle } from "./use-document-title";

describe("useDocumentTitle", () => {
  it("sets document title", () => {
    document.title = "Original";
    renderHook(() => useDocumentTitle("New Title"));
    expect(document.title).toBe("New Title");
  });

  it("restores title on unmount when restoreOnUnmount=true", () => {
    document.title = "Original";
    const { unmount } = renderHook(() => useDocumentTitle("Temporary", true));
    expect(document.title).toBe("Temporary");
    unmount();
    expect(document.title).toBe("Original");
  });

  it("does not restore on unmount when restoreOnUnmount=false", () => {
    document.title = "Original";
    const { unmount } = renderHook(() => useDocumentTitle("Keep", false));
    unmount();
    expect(document.title).toBe("Keep");
  });
});
