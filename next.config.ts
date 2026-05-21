import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // NOTE: ignoreBuildErrors is needed due to a Windows/WSL-specific issue
  // where TypeScript resolves a stray '2' package from npm cache.
  // CI (Ubuntu) does not have this issue — tsc --noEmit runs cleanly there.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  serverExternalPackages: ["twilio"],
  experimental: {
    turbo: undefined,
  },
};

export default withNextIntl(nextConfig);
