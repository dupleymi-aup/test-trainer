import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges multiple class strings", () => {
    expect(cn("px-2", "py-3", "bg-red-500")).toBe("px-2 py-3 bg-red-500");
  });

  it("handles conditional classes with objects", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });

  it("handles null and undefined gracefully", () => {
    expect(cn("base", null, undefined, "end")).toBe("base end");
  });

  it("handles arrays of classes", () => {
    expect(cn(["flex", "items-center"], "p-4")).toBe("flex items-center p-4");
  });

  it("resolves Tailwind conflicts — last wins", () => {
    // twMerge should dedupe conflicting utilities
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("resolves conflicting text sizes", () => {
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("resolves conflicting colors", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("handles mixed input types", () => {
    expect(
      cn("btn", { "btn-primary": true, "btn-lg": false }, ["flex"], null)
    ).toBe("btn btn-primary flex");
  });

  it("keeps non-Tailwind classes intact", () => {
    expect(cn("my-custom-class", "px-2")).toBe("my-custom-class px-2");
  });

  it("handles nested arrays", () => {
    expect(cn(["a", ["b", "c"]], "d")).toBe("a b c d");
  });
});
