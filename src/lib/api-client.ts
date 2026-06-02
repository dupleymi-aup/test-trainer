/**
 * API client helper that automatically includes CSRF tokens
 * for authenticated state-changing requests.
 */

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "./csrf";
import { API_TIMEOUT_MS } from "./time-constants";

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

export interface ApiFetchJsonOptions {
  init?: RequestInit;
  /** Called when the request fails with an APIError or network error */
  onError?: (error: APIError) => void;
  /** Request timeout in milliseconds (default: API_TIMEOUT_MS) */
  timeoutMs?: number;
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
 * Supports optional onError callback and request timeout.
 */
export async function apiFetchJson<T>(url: string, options?: ApiFetchJsonOptions): Promise<T> {
  const { init, onError, timeoutMs = API_TIMEOUT_MS } = options || {};

  const externalSignal = (init as RequestInit & { signal?: AbortSignal })?.signal;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // If an external signal is provided, abort when it fires (e.g., component unmount)
  if (externalSignal) {
    externalSignal.addEventListener("abort", () => {
      controller.abort();
    }, { once: true });
  }

  try {
    // Spread init first, then override signal with our controller so both timeout and external abort work
    const { signal: _, ...initWithoutSignal } = (init as RequestInit & { signal?: AbortSignal }) || {};
    const res = await apiFetch(url, { ...initWithoutSignal, signal: controller.signal });

    if (!res.ok) {
      throw await parseApiError(res);
    }

    return res.json() as Promise<T>;
  } catch (err) {
    const apiError = err instanceof APIError
      ? err
      : err instanceof DOMException && err.name === "AbortError"
        ? new APIError("Request timed out", 408)
        : new APIError("Network error", 0, err);

    onError?.(apiError);
    throw apiError;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Safe JSON fetch that returns data or null on error, with optional onError callback.
 * Useful for non-critical data fetching where you don't want to handle try/catch.
 */
export async function apiFetchJsonSafe<T>(
  url: string,
  options?: ApiFetchJsonOptions
): Promise<T | null> {
  try {
    return await apiFetchJson<T>(url, options);
  } catch {
    return null;
  }
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
