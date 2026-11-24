import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Proxy /api/* to FastAPI so the browser talks to one origin:
  // the login cookie just works and no CORS setup is needed.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
  experimental: {
    // AI generation (with retries on busy free models) can take longer than the 30s default.
    proxyTimeout: 120_000,
  },
};

export default nextConfig;
