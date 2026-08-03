import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Hide the floating Next.js dev-tools badge (dev-only; it overlapped the
  // mobile nav). Build-error overlays still appear when something breaks.
  devIndicators: false,
};

export default nextConfig;
