/**
 * HTTP response utility for consistent error handling
 *
 * Provides helper functions for checking response status and extracting error messages.
 */

/**
 * Check if response is OK and throw descriptive error if not.
 * Useful for use with Promise.then() chains.
 *
 * Usage:
 *   fetch("/api/endpoint")
 *     .then(async (r) => {
 *       if (!r.ok) throw await httpError(r);
 *       return r.json();
 *     });
 */
export async function httpError(response: Response): Promise<Error> {
  let message = `HTTP ${response.status}`;

  try {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const body = await response.json();
      if (body?.error) {
        message = body.error;
      }
    } else {
      const text = await response.text();
      if (text && text.length > 0) {
        message = text.substring(0, 200);
      }
    }
  } catch {
    // If we can't read the body, use the default message
  }

  return new Error(message);
}

/**
 * Assert response is OK, returns the response if valid.
 * Throws descriptive error if not.
 *
 * Usage:
 *   const res = await fetch("/api/endpoint");
 *   const validRes = await assertOk(res);
 *   const data = await validRes.json();
 */
export async function assertOk(response: Response): Promise<Response> {
  if (response.ok) return response;
  throw await httpError(response);
}

/**
 * Parse JSON response with error handling.
 * Returns parsed data or throws descriptive error.
 *
 * Usage:
 *   const data = await parseJson<User[]>(response);
 */
export async function parseJson<T>(response: Response): Promise<T> {
  await assertOk(response);
  return response.json() as Promise<T>;
}
