import type { NextConfig } from "next";

// Baseline security headers applied to every response. (A strict
// Content-Security-Policy is intentionally deferred — it needs per-route
// testing against Next's inline styles/scripts and Recharts to avoid
// breaking the live app.)
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Hide the floating Next.js dev-tools badge (dev-only; it overlapped the
  // mobile nav). Build-error overlays still appear when something breaks.
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
