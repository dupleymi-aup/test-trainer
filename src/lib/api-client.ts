/**
 * API client helper that automatically includes CSRF tokens
 * for authenticated state-changing requests.
 */

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "./csrf";

/**
 * Fetch wrapper that:
 * - Includes credentials (cookies) for all requests
 * - Adds X-CSRF-Token header for POST/PUT/DELETE/PATCH
 */
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});

  // Always include cookies (session)
  const fetchInit: RequestInit = {
    ...init,
    headers,
    credentials: "same-origin",
  };

  // Add CSRF token for state-changing methods
  const method = (init?.method || "GET").toUpperCase();
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const token = getCSRFCookie();
    if (token) {
      headers.set(CSRF_HEADER_NAME, token);
    }
  }

  return fetch(url, fetchInit);
}

function getCSRFCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const name = CSRF_COOKIE_NAME + "=";
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const c = cookie.trim();
    if (c.startsWith(name)) return c.substring(name.length);
  }
  return undefined;
}
