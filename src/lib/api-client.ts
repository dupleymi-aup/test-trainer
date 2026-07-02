/**
 * API client helper that automatically includes CSRF tokens
 * for authenticated state-changing requests.
 */

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "./csrf";
import { API_TIMEOUT_MS } from "./time-constants";

export class APIError extends Error {
  public readonly requestId?: string;

  constructor(
    message: string,
    public status: number,
    public data?: unknown,
    requestId?: string
  ) {
    super(message);
    this.name = "APIError";
    this.requestId = requestId;
  }
}

/**
 * Base fetch wrapper that automatically includes CSRF tokens.
 */
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (typeof document !== "undefined") {
    const csrfToken = getCSRFCookie();
    if (csrfToken) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  return fetch(url, { ...init, headers });
}

/**
 * Configuration for retry behavior on failed requests.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds before first retry (default: 500) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds between retries (default: 5000) */
  maxDelayMs?: number;
  /** List of HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
  retryableStatuses?: number[];
  /** Whether to retry on network errors / timeouts (default: true) */
  retryOnNetworkError?: boolean;
}

/**
 * Default retry configuration for API requests.
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryOnNetworkError: true,
};

/**
 * Sleep for the specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter.
 */
function calculateRetryDelay(
  attempt: number,
  config: Required<RetryConfig>
): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(2, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  // Add jitter: random value between 0 and 25% of the delay
  const jitter = Math.random() * cappedDelay * 0.25;
  return Math.round(cappedDelay + jitter);
}

/**
 * Check if a status code is retryable.
 */
function isRetryableStatus(status: number, config: Required<RetryConfig>): boolean {
  return config.retryableStatuses.includes(status);
}

export interface ApiFetchJsonOptions {
  init?: RequestInit;
  /** Called when the request fails with an APIError or network error */
  onError?: (error: APIError) => void;
  /** Request timeout in milliseconds (default: API_TIMEOUT_MS) */
  timeoutMs?: number;
}

/**
 * Fetch wrapper with automatic retry on transient failures.
 * Uses exponential backoff with jitter between retries.
 * 
 * @param url - The URL to fetch
 * @param init - Optional fetch options
 * @param retryConfig - Optional retry configuration (overrides defaults)
 * @returns Promise<Response>
 * 
 * @example
 * ```ts
 * const res = await apiFetchWithRetry('/api/data', { method: 'GET' });
 * // With custom config:
 * const res = await apiFetchWithRetry('/api/data', {}, { maxRetries: 5 });
 * ```
 */
export async function apiFetchWithRetry(
  url: string,
  init?: RequestInit,
  retryConfig?: RetryConfig
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await apiFetch(url, init);

      // If response is OK, return it immediately
      if (response.ok) {
        return response;
      }

      // Check if this status code is retryable
      if (isRetryableStatus(response.status, config) && attempt < config.maxRetries) {
        lastError = new APIError(`HTTP ${response.status}`, response.status);
        const delay = calculateRetryDelay(attempt + 1, config);
        console.debug(`[apiFetchWithRetry] Retrying after ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})`, { url, status: response.status });
        await sleep(delay);
        continue;
      }

      // Non-retryable error — throw immediately
      throw await parseApiError(response);
    } catch (err) {
      // Network error / timeout — retry if configured
      const isNetworkError = 
        err instanceof DOMException && err.name === "AbortError" ||
        (err instanceof APIError && err.status === 0);

      if (isNetworkError && config.retryOnNetworkError && attempt < config.maxRetries) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const delay = calculateRetryDelay(attempt + 1, config);
        console.debug(`[apiFetchWithRetry] Network error, retrying after ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})`, { url });
        await sleep(delay);
        continue;
      }

      // Not retryable or max retries reached — throw
      throw err;
    }
  }

  // Should not reach here, but TypeScript requires it
  throw lastError ?? new Error("Request failed");
}

/**
 * Typed JSON fetch with retry support.
 * Automatically retries on transient failures (network errors, 429, 5xx).
 * 
 * @param url - The URL to fetch
 * @param options - Optional fetch options and retry configuration
 * @returns Promise<T>
 * 
 * @example
 * ```ts
 * const data = await apiFetchJson<User>('/api/user');
 * // With custom retry config:
 * const data = await apiFetchJson<User>('/api/user', { retryConfig: { maxRetries: 5 } });
 * ```
 */
export async function apiFetchJson<T>(
  url: string,
  options?: ApiFetchJsonOptions & { retryConfig?: RetryConfig }
): Promise<T> {
  const { init, onError, timeoutMs = API_TIMEOUT_MS, retryConfig } = options || {};

  const externalSignal = (init as RequestInit & { signal?: AbortSignal })?.signal;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    externalSignal.addEventListener("abort", () => {
      controller.abort();
    }, { once: true });
  }

  try {
    const { signal: _, ...initWithoutSignal } = (init as RequestInit & { signal?: AbortSignal }) || {};
    
    // Use apiFetchWithRetry if retryConfig is provided, otherwise use apiFetch
    const fetchFn = retryConfig ? apiFetchWithRetry : apiFetch;
    const res = await fetchFn(url, { ...initWithoutSignal, signal: controller.signal }, retryConfig);

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
