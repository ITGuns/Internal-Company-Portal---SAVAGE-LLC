import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Keep config minimal so the default Turbopack dev server can run.
};

export default nextConfig;
