import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "cdn.wiro.ai" },
      { protocol: "https", hostname: "**.wiro.ai" }
    ]
  }
};

export default nextConfig;
