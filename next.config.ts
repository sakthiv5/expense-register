import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Set turbopack root to this directory to avoid inheriting parent workspace types
  turbopack: {
    root: './',
  },
};

export default nextConfig;
