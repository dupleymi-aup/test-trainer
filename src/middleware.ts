import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateCSRFToken, verifyCSRFToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";

// Routes that require authentication
const protectedRoutes = ["/profile", "/teacher", "/admin", "/student"];

// Routes that should redirect to home if already authenticated
const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

// Role-based route protection
const roleRoutes = {
  admin: { paths: ["/admin", "/api/admin"], requiredRole: "ADMIN" },
  teacher: { paths: ["/teacher", "/api/teacher"], requiredRoles: ["TEACHER", "ADMIN"] },
};

// HTTP methods that require CSRF protection
const stateChangingMethods = ["POST", "PUT", "DELETE", "PATCH"];

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const token = await getToken({ req: request });
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // Issue CSRF token for authenticated page requests (not API)
  // Only generate a new token if one doesn't already exist, so concurrent
  // tabs and in-flight requests don't get their tokens invalidated.
  let csrfResponse: NextResponse | null = null;
  if (token && !pathname.startsWith("/api/")) {
    const existingCsrfToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    if (!existingCsrfToken) {
      const csrfToken = generateCSRFToken();
      csrfResponse = NextResponse.next();
      csrfResponse.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false, // Must be readable by JS to send in header
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 2, // 2 hours
        path: "/",
      });
    }
  }

  // CSRF check for state-changing methods on authenticated API routes
  // Only pre-auth routes are excluded (you can't have a CSRF token before login)
  // Authenticated mutation routes (change-password, profile, etc.) require CSRF
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
      return res;
    }
  }

  // If user is not authenticated and tries to access protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtectedRoute && !token) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("callbackUrl", pathname);
    const res = NextResponse.redirect(redirectUrl);
    res.headers.set("X-Request-Id", requestId);
    return res;
  }

  // Role-based protection for admin routes
  const isAdminRoute = roleRoutes.admin.paths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isAdminRoute) {
    if (!token) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      res.headers.set("X-Request-Id", requestId);
      return res;
    }
    if (token.role !== "ADMIN") {
      if (pathname.startsWith("/api/")) {
        const res = NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
        res.headers.set("X-Request-Id", requestId);
        return res;
      }
      const res = NextResponse.redirect(new URL("/", request.url));
      res.headers.set("X-Request-Id", requestId);
      return res;
    }
  }

  // Role-based protection for teacher routes
  const isTeacherRoute = roleRoutes.teacher.paths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isTeacherRoute) {
    if (!token) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      res.headers.set("X-Request-Id", requestId);
      return res;
    }
    if (token.role !== "TEACHER" && token.role !== "ADMIN") {
      if (pathname.startsWith("/api/")) {
        const res = NextResponse.json({ error: "Forbidden: teacher or admin access required" }, { status: 403 });
        res.headers.set("X-Request-Id", requestId);
        return res;
      }
      const res = NextResponse.redirect(new URL("/", request.url));
      res.headers.set("X-Request-Id", requestId);
      return res;
    }
  }

  // Role-based protection for student routes
  const isStudentRoute = pathname === "/student" || pathname.startsWith("/student/");
  if (isStudentRoute) {
    if (!token) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("callbackUrl", pathname);
      const res = NextResponse.redirect(redirectUrl);
      res.headers.set("X-Request-Id", requestId);
      return res;
    }
    if (token.role !== "STUDENT") {
      if (token.role === "TEACHER") {
        const res = NextResponse.redirect(new URL("/teacher", request.url));
        res.headers.set("X-Request-Id", requestId);
        return res;
      }
      if (token.role === "ADMIN") {
        const res = NextResponse.redirect(new URL("/admin", request.url));
        res.headers.set("X-Request-Id", requestId);
        return res;
      }
      const res = NextResponse.redirect(new URL("/", request.url));
      res.headers.set("X-Request-Id", requestId);
      return res;
    }
  }

  // If user is authenticated and tries to access auth pages, redirect to home
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isAuthRoute && token) {
    const res = NextResponse.redirect(new URL("/", request.url));
    res.headers.set("X-Request-Id", requestId);
    return res;
  }

  if (csrfResponse) {
    csrfResponse.headers.set("X-Request-Id", requestId);
    if (isApiRoute) {
      logger.info("API request", { method, path: pathname, status: 200, duration: Date.now() - startTime, userId: token?.sub, requestId });
    }
    return csrfResponse;
  }
  if (isApiRoute) {
    logger.info("API request", { method, path: pathname, status: 200, duration: Date.now() - startTime, userId: token?.sub, requestId });
  }
  const res = NextResponse.next();
  res.headers.set("X-Request-Id", requestId);
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (files with extensions like .js, .css, .png, etc.)
     *
     * All API routes are included — CSRF exemptions are handled in the middleware body
     * via the preAuthRoutes list. This ensures new API routes are CSRF-protected by default.
     */
    "/((?!_next/static|_next/image|_next/data|favicon\\.ico|.*\\.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$).*)",
  ],
};
