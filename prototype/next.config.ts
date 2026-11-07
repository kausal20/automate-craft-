import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack inside prototype/ so this app never resolves parent files.
  turbopack: {
    root: process.cwd(),
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        // Network lock: the browser refuses fetch/XHR/WebSocket to any other
        // origin, so the prototype cannot reach a production service even if
        // someone adds a real API call by mistake.
        { key: "Content-Security-Policy", value: "connect-src 'self'" },
      ],
    },
  ],
};

export default nextConfig;
