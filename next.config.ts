import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SSR mode — no static export, needed for Route Handlers (AI + auth proxy)
  images: { unoptimized: true },
};

export default nextConfig;
