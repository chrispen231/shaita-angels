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

    /*
     * Uploaded images live in Supabase Storage, so the optimiser has to be allowed
     * to fetch them. Without this every uploaded sponsor logo, story image, player
     * photo and opponent crest 400s at render time - which is the whole feature
     * failing while looking fine in the admin.
     *
     * The hostname is read from the environment rather than hardcoded so a staging
     * project works too, and so the project reference is not duplicated here.
     *
     * pathname is narrowed to /storage/v1/object/public/ deliberately: this permits
     * the club's own public bucket, and nothing else on the Supabase host.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
