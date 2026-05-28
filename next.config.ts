import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // medical-parser uses pdf-parse v2 (Node-only, native-ish). Skipping
  // bundling and using Node's runtime require resolution avoids Turbopack
  // trying to follow ESM/CJS edge cases through pdf-parse internals.
  serverExternalPackages: ["medical-parser", "pdf-parse"],

  // Default body limit for server actions is 1 MB. Medical reports can
  // be 10-50 MB (matching the Storage bucket cap), so raise it.
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
