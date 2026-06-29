import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateCSRFToken, verifyCSRFToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { buildCSP } from "@/lib/csp";

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function setSecurityHeaders(res: NextResponse, nonce: string): void {
  res.headers.set("x-nonce", nonce);
  res.headers.set("Content-Security-Policy", buildCSP(nonce, process.env.NODE_ENV === "development"));
}

const protectedRoutes = ["/profile", "/teacher", "/admin", "/student"];
const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

const roleRoutes: Record<string, { paths: string[]; requiredRoles: string[] }> = {
  admin: { paths: ["/admin", "/api/admin"], requiredRoles: ["ADMIN"] },
  teacher: { paths: ["/teacher", "/api/teacher"], requiredRoles: ["TEACHER", "ADMIN"] },
};

const stateChangingMethods = ["POST", "PUT", "DELETE", "PATCH"];

function checkRoleAccess(
  token: { role?: string } | null,
  routeConfig: { paths: string[]; requiredRoles: string[] },
  pathname: string,
  requestId: string,
  nonce: string
): NextResponse | null {
  const isMatch = routeConfig.paths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!isMatch) return null;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", pathname));
  }

  const hasAccess = routeConfig.requiredRoles.includes(token.role ?? "");
  if (hasAccess) return null;

  if (pathname.startsWith("/api/")) {
    const res = NextResponse.json(
      { error: `Forbidden: ${routeConfig.requiredRoles.join(" or ")} access required` },
      { status: 403 }
    );
    res.headers.set("X-Request-Id", requestId);
    setSecurityHeaders(res, nonce);
    return res;
  }

  const res = NextResponse.redirect(new URL("/", pathname));
  res.headers.set("X-Request-Id", requestId);
  setSecurityHeaders(res, nonce);
  return res;
}

function checkStudentAccess(
  token: { role?: string } | null,
  pathname: string,
  requestUrl: string,
  requestId: string,
  nonce: string
): NextResponse | null {
  const isStudentRoute = pathname === "/student" || pathname.startsWith("/student/");
  if (!isStudentRoute) return null;

  if (!token) {
    const redirectUrl = new URL("/login", requestUrl);
    redirectUrl.searchParams.set("callbackUrl", pathname);
    const res = NextResponse.redirect(redirectUrl);
    res.headers.set("X-Request-Id", requestId);
    setSecurityHeaders(res, nonce);
    return res;
  }

  if (token.role === "STUDENT") return null;

  const redirectMap: Record<string, string> = {
    TEACHER: "/teacher",
    ADMIN: "/admin",
  };
  const target = redirectMap[token.role ?? ""] ?? "/";
  const res = NextResponse.redirect(new URL(target, requestUrl));
  res.headers.set("X-Request-Id", requestId);
  setSecurityHeaders(res, nonce);
  return res;
}

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? generateRequestId();
  const nonce = generateRequestId();
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // Skip auth for E2E tests via query parameter
  const e2eMode = request.nextUrl.searchParams.get("e2e") === "true";

  let csrfResponse: NextResponse | null = null;
  let token = null;

  if (!e2eMode) {
    token = await getToken({ req: request });
  }

  if (token && !pathname.startsWith("/api/")) {
    const existingCsrfToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    if (!existingCsrfToken) {
      const csrfToken = generateCSRFToken();
      csrfResponse = NextResponse.next();
      csrfResponse.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 2,
        path: "/",
      });
    }
  }

  const isApiRoute = pathname.startsWith("/api/");
  const preAuthRoutes = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/verify-otp",
    "/api/auth/session",
    "/api/auth/csrf-token",
  ];
  const isPreAuthRoute = preAuthRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isApiRoute && !isPreAuthRoute && token && stateChangingMethods.includes(method)) {
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    const headerToken = request.headers.get(CSRF_HEADER_NAME) ?? undefined;
    if (!verifyCSRFToken(cookieToken, headerToken)) {
      const res = NextResponse.json({ error: "CSRF token missing or invalid" }, { status: 403 });
      res.headers.set("X-Request-Id", requestId);
      setSecurityHeaders(res, nonce);
      return res;
    }
  }

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (isProtectedRoute && !token && !e2eMode) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("callbackUrl", pathname);
    const res = NextResponse.redirect(redirectUrl);
    res.headers.set("X-Request-Id", requestId);
    setSecurityHeaders(res, nonce);
    return res;
  }

  for (const [, config] of Object.entries(roleRoutes)) {
    const roleResult = checkRoleAccess(token, config, pathname, requestId, nonce);
    if (roleResult) return roleResult;
  }

  const studentResult = checkStudentAccess(token, pathname, request.url, requestId, nonce);
  if (studentResult) return studentResult;

  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (isAuthRoute && token && !e2eMode) {
    const res = NextResponse.redirect(new URL("/", request.url));
    res.headers.set("X-Request-Id", requestId);
    setSecurityHeaders(res, nonce);
    return res;
  }

  if (csrfResponse) {
    csrfResponse.headers.set("X-Request-Id", requestId);
    setSecurityHeaders(csrfResponse, nonce);
    if (isApiRoute) {
      logger.info("API request start", { method, path: pathname, requestId, userId: token?.sub });
    }
    return csrfResponse;
  }
  if (isApiRoute) {
    logger.info("API request start", { method, path: pathname, requestId, userId: token?.sub });
  }
  const res = NextResponse.next();
  res.headers.set("X-Request-Id", requestId);
  setSecurityHeaders(res, nonce);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon\\.ico|.*\\.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$).*)",
  ],
};
