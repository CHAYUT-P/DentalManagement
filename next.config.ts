import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // the VPS image (deploy/Dockerfile) runs the self-contained server build;
  // Vercel builds without it
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  // the floating dev badge sits on top of the phone mockups
  devIndicators: false,
  // patient photos and X-rays go up through server actions (Vercel caps a
  // request at 4.5 MB; the page shrinks photos before sending)
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
