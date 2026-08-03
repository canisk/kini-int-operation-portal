import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Temp Vercel deploys: include SQLite in serverless bundles.
  outputFileTracingIncludes: {
    "/api/v1/plans": ["./data/product-all-log.db"],
    "/api/v1/plans/[id]": ["./data/product-all-log.db"],
    "/api/v1/plans/[id]/audit-logs": ["./data/product-all-log.db"],
    "/api/v1/sync/offerings": ["./data/product-all-log.db"],
  },
};

export default nextConfig;
