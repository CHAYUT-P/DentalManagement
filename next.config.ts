import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // the floating dev badge sits on top of the phone mockups
  devIndicators: false,
  // patient photos and X-rays go up through server actions (Vercel caps a
  // request at 4.5 MB; the page shrinks photos before sending)
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
