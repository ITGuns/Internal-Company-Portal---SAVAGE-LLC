import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',
  // Proxy all /api/* and /auth/* requests to the backend
  // This avoids CORS issues since the request comes from Next.js server → backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
      {
        source: '/backend-auth/:path*',
        destination: 'http://localhost:4000/auth/:path*',
      },
    ];
  },
};

export default nextConfig;
