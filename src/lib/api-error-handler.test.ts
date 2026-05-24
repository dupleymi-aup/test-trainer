import { describe, it, expect } from "vitest";
import { formatZodError } from "./api-error-handler";
import { z } from "zod";

describe("formatZodError", () => {
  it("formats single field error with path", () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: "invalid" });
    if (!result.success) {
      expect(formatZodError(result.error)).toBe("email: Invalid email address");
    }
  });

  it("formats multiple field errors joined with semicolons", () => {
    const schema = z.object({
      name: z.string().min(1, "Name is required"),
      age: z.number().min(0, "Age must be positive"),
    });
    const result = schema.safeParse({ name: "", age: -1 });
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted).toContain("name: Name is required");
      expect(formatted).toContain("age: Age must be positive");
      expect(formatted).toContain(";");
    }
  });

  it("formats nested field errors", () => {
    const schema = z.object({
      user: z.object({ name: z.string().min(1, "Name required") }),
    });
    const result = schema.safeParse({ user: { name: "" } });
    if (!result.success) {
      expect(formatZodError(result.error)).toBe("user.name: Name required");
    }
  });

  it("handles errors without path (refine)", () => {
    const schema = z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }).refine((data) => data.email || data.phone, {
      message: "Provide email or phone",
    });
    const result = schema.safeParse({});
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted).toContain("Provide email or phone");
    }
  });

  it("handles empty issues array gracefully", () => {
    const mockError = { issues: [] } as any;
    expect(formatZodError(mockError)).toBe("Validation failed");
  });

  it("handles null issues gracefully", () => {
    const mockError = { issues: null } as any;
    expect(formatZodError(mockError)).toBe("Validation failed");
  });
});
