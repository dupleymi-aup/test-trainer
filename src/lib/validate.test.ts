import { describe, it, expect } from "vitest";
import { parsePositiveInt } from "./validate";

describe("parsePositiveInt", () => {
  it("returns parsed value for valid integer string", () => {
    expect(parsePositiveInt("5", 10)).toBe(5);
  });

  it("returns default for null", () => {
    expect(parsePositiveInt(null, 10)).toBe(10);
  });

  it("returns default for undefined", () => {
    expect(parsePositiveInt(undefined as unknown as string, 10)).toBe(10);
  });

  it("returns default for empty string", () => {
    expect(parsePositiveInt("", 10)).toBe(10);
  });

  it("returns default for non-numeric string", () => {
    expect(parsePositiveInt("abc", 10)).toBe(10);
  });

  it("returns default for zero", () => {
    expect(parsePositiveInt("0", 10)).toBe(10);
  });

  it("returns default for negative number", () => {
    expect(parsePositiveInt("-5", 10)).toBe(10);
  });

  it("parses decimal as integer (truncates)", () => {
    expect(parsePositiveInt("3.7", 10)).toBe(3);
  });

  it("parses large valid number", () => {
    expect(parsePositiveInt("999", 10)).toBe(999);
  });

  it("returns default for Infinity string", () => {
    expect(parsePositiveInt("Infinity", 10)).toBe(10);
  });

  it("returns 1 for minimum positive integer", () => {
    expect(parsePositiveInt("1", 10)).toBe(1);
  });

  it("returns default for NaN", () => {
    expect(parsePositiveInt("NaN", 10)).toBe(10);
  });
});
