import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatZodError, logApiError, apiErrorResponse, parseRequestBody } from "./api-error-handler";
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
    const mockError = { issues: [] } as unknown as z.ZodError;
    expect(formatZodError(mockError)).toBe("Validation failed");
  });

  it("handles null issues gracefully", () => {
    const mockError = { issues: null } as unknown as z.ZodError;
    expect(formatZodError(mockError)).toBe("Validation failed");
  });
});

describe("apiErrorResponse", () => {
  it("returns a 500 NextResponse with error message", async () => {
    const res = apiErrorResponse("Something broke");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Something broke" });
  });

  it("returns a custom status code", async () => {
    const res = apiErrorResponse("Not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Not found" });
  });
});

describe("logApiError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("logs error with route and Error instance context", () => {
    logApiError("test/route", new Error("boom"));
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[API] test/route")
    );
    const call = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const entry = JSON.parse(call);
    expect(entry.context).toMatchObject({ name: "Error", message: "boom" });
  });

  it("logs error with non-Error value as string", () => {
    logApiError("test/route", "plain string error");
    expect(console.error).toHaveBeenCalled();
    const call = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const entry = JSON.parse(call);
    expect(entry.context).toMatchObject({ error: "plain string error" });
  });

  it("merges extra context into the log", () => {
    logApiError("test/route", new Error("boom"), { userId: "u1" });
    const call = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const entry = JSON.parse(call);
    expect(entry.context).toMatchObject({ userId: "u1", name: "Error", message: "boom" });
  });
});

describe("parseRequestBody", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("parses valid JSON body and returns success", async () => {
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });
    const result = await parseRequestBody(req, schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "test" });
    }
  });

  it("returns validation error for malformed body", async () => {
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    });
    const result = await parseRequestBody(req, schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorResponse.status).toBe(400);
      const body = await result.errorResponse.json();
      expect(body.error).toBeTruthy();
    }
  });

  it("returns error for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: "not json{",
    });
    const result = await parseRequestBody(req, schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorResponse.status).toBe(400);
      const body = await result.errorResponse.json();
      expect(body.error).toBe("Invalid JSON body");
    }
  });
});
