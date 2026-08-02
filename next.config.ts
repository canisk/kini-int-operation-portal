import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ensure the SQLite DB is copied into Vercel serverless function bundles.
  // Without this, /api/v1/plans can't find data/product-all-log.db in production.
  outputFileTracingIncludes: {
    "/api/v1/plans": ["./data/product-all-log.db"],
    "/api/v1/plans/[id]": ["./data/product-all-log.db"],
    "/api/v1/plans/[id]/audit-logs": ["./data/product-all-log.db"],
    "/api/v1/sync/offerings": ["./data/product-all-log.db"],
  },
};

export default nextConfig;
