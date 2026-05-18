/**
 * API client helper that automatically includes CSRF tokens
 * for authenticated state-changing requests.
 */

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "./csrf";

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "APIError";
  }
}

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

/**
 * Typed JSON fetch that throws APIError on non-OK responses.
 */
export async function apiFetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(url, init);

  if (!res.ok) {
    throw await parseApiError(res);
  }

  return res.json() as Promise<T>;
}

/**
 * Safe fetch that returns a result object instead of throwing.
 */
export async function apiFetchSafe(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; data: Response } | { ok: false; error: APIError }> {
  try {
    const res = await apiFetch(url, init);
    if (!res.ok) {
      return { ok: false, error: await parseApiError(res) };
    }
    return { ok: true, data: res };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof APIError ? err : new APIError("Network error", 0, err),
    };
  }
}

async function parseApiError(res: Response): Promise<APIError> {
  const data = await res.json().catch(() => null);
  const message = (data as { error?: string } | null)?.error || `HTTP ${res.status}`;
  return new APIError(message, res.status, data);
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
