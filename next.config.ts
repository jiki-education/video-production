import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable type checking during build (we have separate typecheck script)
  typescript: {
    ignoreBuildErrors: true
  },
  // Disable ESLint during build (we have separate lint script)
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
