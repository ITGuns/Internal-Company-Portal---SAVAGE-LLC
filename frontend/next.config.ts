import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',
  // Proxy all /api/* and /auth/* requests to the backend
  // This avoids CORS issues since the request comes from Next.js server → backend
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/backend-auth/:path*',
        destination: `${backendUrl}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
