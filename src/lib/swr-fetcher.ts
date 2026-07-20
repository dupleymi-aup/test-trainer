/**
 * SWR fetcher with CSRF token and auth headers
 * Automatically includes authentication headers for API requests
 */

export interface FetcherError extends Error {
  status?: number;
  data?: unknown;
}

/**
 * Create an authenticated fetcher for SWR
 * Handles auth tokens, CSRF, and error parsing
 */
export async function swrFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || "Request failed") as FetcherError;
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

/**
 * Create a mutation fetcher (for POST/PUT/DELETE)
 * Includes CSRF token and returns response data
 */
export async function swrMutateFetcher<T = unknown>(
  method: "POST" | "PUT" | "DELETE" | "PATCH",
  url: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || "Mutation failed") as FetcherError;
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}
