export function buildCSP(nonce: string, isDev: boolean): string {
  if (isDev) {
    return [
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss: http: https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https:",
      "style-src 'self' 'unsafe-inline' data: blob: http: https:",
      "img-src 'self' data: blob: http: https:",
      "font-src 'self' data: http: https:",
      "connect-src 'self' data: blob: ws: wss: http: https:",
      "frame-src 'self' data: blob: http: https:",
      "frame-ancestors 'self' http: https:",
      "media-src 'self' data: blob: http: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' http: https:",
    ].join("; ");
  }

  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
