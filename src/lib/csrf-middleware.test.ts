import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { requireCSRF } from "./csrf-middleware";

const mockSession = vi.hoisted(() => ({ user: { id: "user-1" } }));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("./auth", () => ({
  authOptions: {},
}));

vi.mock("./csrf", () => ({
  verifyCSRFToken: vi.fn(),
  CSRF_COOKIE_NAME: "csrf-token",
  CSRF_HEADER_NAME: "x-csrf-token",
}));

import { verifyCSRFToken } from "./csrf";
import { getServerSession } from "next-auth";

function mockRequest(method: string, cookie?: string, header?: string): Request {
  const headers: Record<string, string> = {};
  if (cookie) headers["cookie"] = cookie;
  if (header) headers["x-csrf-token"] = header;
  return new Request("http://localhost", { method, headers });
}

describe("requireCSRF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("safe methods", () => {
    it.each(["GET", "HEAD", "OPTIONS"])("allows %s without token", async (method) => {
      const result = await requireCSRF(mockRequest(method));
      expect(result).toEqual({ verified: true });
    });
  });

  describe("unauthenticated requests", () => {
    it("passes through for POST without session", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const result = await requireCSRF(mockRequest("POST"));
      expect(result).toEqual({ verified: true });
    });
  });

  describe("authenticated state-changing requests", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    });

    it("returns 403 when cookie token is missing", async () => {
      const result = await requireCSRF(mockRequest("POST", undefined, "some-token"));
      expect("response" in result).toBe(true);
      if ("response" in result) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body).toEqual({ error: "CSRF token missing" });
      }
    });

    it("returns 403 when header token is missing", async () => {
      const result = await requireCSRF(mockRequest("POST", "csrf-token=abc"));
      expect("response" in result).toBe(true);
      if ("response" in result) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body).toEqual({ error: "CSRF token missing" });
      }
    });

    it("returns 403 when tokens do not match", async () => {
      vi.mocked(verifyCSRFToken).mockReturnValueOnce(false);
      const result = await requireCSRF(
        mockRequest("POST", "csrf-token=abc", "xyz")
      );
      expect("response" in result).toBe(true);
      if ("response" in result) {
        expect(result.response.status).toBe(403);
        const body = await result.response.json();
        expect(body).toEqual({ error: "CSRF token verification failed" });
      }
    });

    it("returns verified: true when tokens match", async () => {
      vi.mocked(verifyCSRFToken).mockReturnValueOnce(true);
      const result = await requireCSRF(
        mockRequest("POST", "csrf-token=abc", "abc")
      );
      expect(result).toEqual({ verified: true });
    });

    it.each(["PUT", "DELETE", "PATCH"])("validates %s method", async (method) => {
      vi.mocked(verifyCSRFToken).mockReturnValueOnce(true);
      const result = await requireCSRF(
        mockRequest(method, "csrf-token=abc", "abc")
      );
      expect(result).toEqual({ verified: true });
    });
  });
});
