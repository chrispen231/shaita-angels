import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Next regenerates AGENTS.md / CLAUDE.md on every `next dev` unless this is
  // set. This project documents itself in README.md and docs/, so the stub files
  // are disabled to avoid a permanently dirty working tree.
  agentRules: false,

  images: {
    // AVIF first, WebP fallback. Much of this audience is on mobile data and
    // the squad photography is a few MB of source JPEGs.
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
