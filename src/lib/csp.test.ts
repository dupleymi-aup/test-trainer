import { describe, it, expect } from "vitest";
import { buildCSP } from "./csp";

describe("buildCSP", () => {
  it("dev mode includes unsafe-inline and unsafe-eval", () => {
    const csp = buildCSP("test-nonce", true);
    expect(csp).toContain("'unsafe-inline'");
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("data:");
    expect(csp).toContain("blob:");
  });

  it("prod mode uses nonce and strict-dynamic", () => {
    const csp = buildCSP("abc123", false);
    expect(csp).toContain("nonce-abc123");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("'unsafe-inline'");
  });

  it("prod mode restricts frame-ancestors to none", () => {
    const csp = buildCSP("nonce", false);
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("prod mode restricts object-src to none", () => {
    const csp = buildCSP("nonce", false);
    expect(csp).toContain("object-src 'none'");
  });

  it("prod mode restricts base-uri to self", () => {
    const csp = buildCSP("nonce", false);
    expect(csp).toContain("base-uri 'self'");
  });

  it("prod mode restricts form-action to self", () => {
    const csp = buildCSP("nonce", false);
    expect(csp).toContain("form-action 'self'");
  });

  it("dev mode allows http and https in connect-src", () => {
    const csp = buildCSP("nonce", true);
    expect(csp).toContain("connect-src 'self' data: blob: ws: wss: http: https:");
  });

  it("returns semicolon-separated directives", () => {
    const csp = buildCSP("nonce", false);
    const directives = csp.split("; ");
    expect(directives.length).toBeGreaterThan(5);
    expect(directives[0]).toBe("default-src 'self'");
  });
});
