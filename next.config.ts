import type { NextConfig } from "next";

console.log(
  "DEBUG - [next.config] NEXT_PUBLIC_API_BASE_URL =",
  process.env.NEXT_PUBLIC_API_BASE_URL
);

const NEXT_PUBLIC_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactCompiler: true,
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          `${NEXT_PUBLIC_API_BASE_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;