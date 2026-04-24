import type { NextConfig } from "next";


const NEXT_PUBLIC_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL;

const nextConfig: NextConfig = {
  reactCompiler: true,
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          `${NEXT_PUBLIC_API_BASE_URL}/api/:path*/`,
      },
    ];
  },
};

export default nextConfig;