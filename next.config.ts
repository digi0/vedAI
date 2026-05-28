import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // medical-parser uses pdf-parse v2 (Node-only, native-ish). Skipping
  // bundling and using Node's runtime require resolution avoids Turbopack
  // trying to follow ESM/CJS edge cases through pdf-parse internals.
  serverExternalPackages: ["medical-parser", "pdf-parse"],
};

export default nextConfig;
