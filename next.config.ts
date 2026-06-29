import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import bundleAnalyzer from "@next/bundle-analyzer";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  compress: true,
  async headers() {
    return [
      {
        source: "/api/admin/analytics/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/api/admin/stats",
        headers: [
          {
            key: "Cache-Control",
            value: "private, s-maxage=30, stale-while-revalidate=120",
          },
        ],
      },
      {
        source: "/api/teacher/analytics/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/api/teacher/reports/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/api/student/analytics",
        headers: [
          {
            key: "Cache-Control",
            value: "private, s-maxage=30, stale-while-revalidate=120",
          },
        ],
      },
      {
        source: "/api/student/leaderboard",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/api/student/announcements",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=120, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/api/health",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
