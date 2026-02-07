import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: "/:locale(en|de|fr)/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;