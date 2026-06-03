import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep medical-parser + unpdf out of the bundle so they're require'd from
  // node_modules at runtime (unpdf ships a serverless-safe pdf.js build).
  serverExternalPackages: ["medical-parser", "unpdf"],

  // Default body limit for server actions is 1 MB. Medical reports can
  // be 10-50 MB (matching the Storage bucket cap), so raise it.
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
