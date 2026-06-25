import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatZodError, logApiError, apiErrorResponse, parseRequestBody, parseSearchParams, withErrorHandler, validateApiResponse } from "./api-error-handler";
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

describe("parseSearchParams", () => {
  const schema = z.object({
    groupId: z.string().min(1),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  });

  it("parses valid search params and returns success", () => {
    const req = new Request("http://localhost/api/test?groupId=abc&page=2&limit=20");
    const result = parseSearchParams(req, schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ groupId: "abc", page: 2, limit: 20 });
    }
  });

  it("applies defaults for missing optional params", () => {
    const req = new Request("http://localhost/api/test?groupId=abc");
    const result = parseSearchParams(req, schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ groupId: "abc", page: 1, limit: 10 });
    }
  });

  it("returns validation error for missing required params", () => {
    const req = new Request("http://localhost/api/test?page=1");
    const result = parseSearchParams(req, schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorResponse.status).toBe(400);
    }
  });

  it("returns validation error for invalid param types", () => {
    const req = new Request("http://localhost/api/test?groupId=abc&page=notanumber");
    const result = parseSearchParams(req, schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorResponse.status).toBe(400);
    }
  });

  it("returns validation error for out-of-range values", () => {
    const req = new Request("http://localhost/api/test?groupId=abc&limit=999");
    const result = parseSearchParams(req, schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorResponse.status).toBe(400);
    }
  });

  it("handles empty query string", () => {
    const req = new Request("http://localhost/api/test");
    const result = parseSearchParams(req, schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorResponse.status).toBe(400);
    }
  });
});

describe("withErrorHandler", () => {
  it("returns handler result on success", async () => {
    const req = new Request("http://localhost/api/test");
    const res = await withErrorHandler(req, async () => {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("returns 500 JSON error when handler throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const req = new Request("http://localhost/api/test");
    const res = await withErrorHandler(req, async () => {
      throw new Error("something broke");
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
  });

  it("includes details in development mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const req = new Request("http://localhost/api/test");
    const res = await withErrorHandler(req, async () => {
      throw new Error("dev error detail");
    });
    const body = await res.json();
    expect(body.details).toBe("dev error detail");
    vi.unstubAllEnvs();
  });

  it("hides details in production mode", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const req = new Request("http://localhost/api/test");
    const res = await withErrorHandler(req, async () => {
      throw new Error("prod secret");
    });
    const body = await res.json();
    expect(body.details).toBeUndefined();
    vi.unstubAllEnvs();
  });

  it("handles non-Error thrown values", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const req = new Request("http://localhost/api/test");
    const res = await withErrorHandler(req, async () => {
      throw "string error";
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
  });
});

describe("validateApiResponse", () => {
  const schema = z.object({
    attempts: z.number(),
    name: z.string(),
  });

  it("returns parsed data when valid", () => {
    const data = { attempts: 5, name: "test" };
    const result = validateApiResponse(schema, data);
    expect(result).toEqual(data);
  });

  it("throws in development mode on invalid data", () => {
    vi.stubEnv("NODE_ENV", "development");
    const data = { attempts: "not a number", name: 123 };
    expect(() => validateApiResponse(schema, data)).toThrow("API response validation failed");
    vi.unstubAllEnvs();
  });

  it("logs warning and returns raw data in production mode on invalid data", () => {
    vi.stubEnv("NODE_ENV", "production");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const data = { attempts: "bad", name: 123 };
    const result = validateApiResponse(schema, data);
    expect(result).toEqual(data);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("API response validation failed"));
    vi.unstubAllEnvs();
  });

  it("validates nested schemas", () => {
    const nested = z.object({
      user: z.object({ id: z.string(), score: z.number() }),
    });
    const valid = { user: { id: "u1", score: 100 } };
    expect(validateApiResponse(nested, valid)).toEqual(valid);
  });

  it("validates array schemas", () => {
    const arrSchema = z.array(z.object({ id: z.number() }));
    const valid = [{ id: 1 }, { id: 2 }];
    expect(validateApiResponse(arrSchema, valid)).toEqual(valid);
  });

  it("includes field paths in error messages", () => {
    vi.stubEnv("NODE_ENV", "development");
    const data = { attempts: "wrong", name: 42 };
    try {
      validateApiResponse(schema, data);
    } catch (e) {
      expect((e as Error).message).toContain("attempts");
    }
    vi.unstubAllEnvs();
  });
});
