import { describe, it, expect } from "vitest";
import { cn, parseInputValue, safeJsonParse } from "./utils";

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

describe("parseInputValue", () => {
  it("parses boolean true (EN)", () => {
    expect(parseInputValue("true")).toBe(true);
  });

  it("parses boolean false (EN)", () => {
    expect(parseInputValue("false")).toBe(false);
  });

  it("parses boolean true (RU)", () => {
    expect(parseInputValue("да")).toBe(true);
    expect(parseInputValue("верно")).toBe(true);
  });

  it("parses boolean false (RU)", () => {
    expect(parseInputValue("нет")).toBe(false);
    expect(parseInputValue("неверно")).toBe(false);
  });

  it("parses null", () => {
    expect(parseInputValue("null")).toBeNull();
  });

  it("parses undefined", () => {
    expect(parseInputValue("undefined")).toBeUndefined();
  });

  it("parses integers", () => {
    expect(parseInputValue("42")).toBe(42);
    expect(parseInputValue("-7")).toBe(-7);
  });

  it("parses decimals", () => {
    expect(parseInputValue("3.14")).toBe(3.14);
    expect(parseInputValue("-0.5")).toBe(-0.5);
  });

  it("parses scientific notation", () => {
    expect(parseInputValue("1e3")).toBe(1000);
    expect(parseInputValue("2.5E-2")).toBe(0.025);
  });

  it("parses JSON objects", () => {
    expect(parseInputValue('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON arrays", () => {
    expect(parseInputValue("[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("returns trimmed string for non-numeric non-JSON input", () => {
    expect(parseInputValue("  hello  ")).toBe("hello");
  });

  it("handles whitespace around values", () => {
    expect(parseInputValue("  true  ")).toBe(true);
    expect(parseInputValue("  42  ")).toBe(42);
  });

  it("returns empty string as-is", () => {
    expect(parseInputValue("")).toBe("");
  });

  it("does not parse non-numeric strings as numbers", () => {
    expect(parseInputValue("abc")).toBe("abc");
    expect(parseInputValue("12abc")).toBe("12abc");
  });
});

describe("safeJsonParse", () => {
  it("parses valid JSON string", () => {
    expect(safeJsonParse("[1,2,3]", [])).toEqual([1, 2, 3]);
  });

  it("parses JSON object", () => {
    expect(safeJsonParse('{"key":"value"}', {})).toEqual({ key: "value" });
  });

  it("returns fallback for null input", () => {
    expect(safeJsonParse(null, [1, 2])).toEqual([1, 2]);
  });

  it("returns fallback for undefined input", () => {
    expect(safeJsonParse(undefined, "default")).toBe("default");
  });

  it("returns fallback for empty string", () => {
    expect(safeJsonParse("", "fallback")).toBe("fallback");
  });

  it("returns fallback for invalid JSON", () => {
    expect(safeJsonParse("not-json", [])).toEqual([]);
  });

  it("returns fallback for malformed JSON", () => {
    expect(safeJsonParse('{"incomplete":', null)).toBeNull();
  });

  it("parses nested JSON structures", () => {
    const nested = '{"a":{"b":[1,2,3]}}';
    expect(safeJsonParse(nested, {})).toEqual({ a: { b: [1, 2, 3] } });
  });

  it("handles JSON primitives", () => {
    expect(safeJsonParse('"hello"', "")).toBe("hello");
    expect(safeJsonParse("42", 0)).toBe(42);
    expect(safeJsonParse("true", false)).toBe(true);
  });

  it("returns fallback when parsed result is not object or array (primitives)", () => {
    // JSON.parse can return primitives; safeJsonParse should still return them
    expect(safeJsonParse("null", "fallback")).toBeNull();
    expect(safeJsonParse("42", "fallback")).toBe(42);
  });
});
