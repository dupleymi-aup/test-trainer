import { describe, it, expect } from "vitest";
import { httpError, assertOk, parseJson } from "./http-utils";

describe("http-utils", () => {
  describe("httpError", () => {
    it("returns error with HTTP status code", async () => {
      const response = new Response(null, { status: 500, statusText: "Internal Server Error" });
      const error = await httpError(response);
      expect(error.message).toBe("HTTP 500");
    });

    it("extracts error message from JSON response", async () => {
      const body = JSON.stringify({ error: "User not found" });
      const response = new Response(body, {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
      const error = await httpError(response);
      expect(error.message).toBe("User not found");
    });

    it("extracts error message from plain text response", async () => {
      const response = new Response("Something went wrong", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
      const error = await httpError(response);
      expect(error.message).toBe("Something went wrong");
    });

    it("truncates long error messages to 200 chars", async () => {
      const longText = "x".repeat(500);
      const response = new Response(longText, {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
      const error = await httpError(response);
      expect(error.message.length).toBe(200);
    });
  });

  describe("assertOk", () => {
    it("returns response when OK", async () => {
      const response = new Response(null, { status: 200 });
      const result = await assertOk(response);
      expect(result.status).toBe(200);
    });

    it("throws error when not OK", async () => {
      const response = new Response(null, { status: 404 });
      await expect(assertOk(response)).rejects.toThrow("HTTP 404");
    });
  });

  describe("parseJson", () => {
    it("parses JSON when response is OK", async () => {
      const data = { id: "1", name: "Test" };
      const response = new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      const result = await parseJson<typeof data>(response);
      expect(result).toEqual(data);
    });

    it("throws error when response is not OK", async () => {
      const response = new Response(null, { status: 500 });
      await expect(parseJson<unknown>(response)).rejects.toThrow("HTTP 500");
    });
  });
});
