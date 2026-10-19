import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/**
 * Photographs under public/ whose filenames are stable. Vercel otherwise serves
 * them with `max-age=0, must-revalidate`, so every visit revalidated the hero
 * photograph and the archive shots.
 */
const publicImages =
  "/:file(gallery-1.jpg|gallery-2.jpg|gallery-3.jpg|hero-orange-cup-2026.jpg|news-featured.jpg|orange-cup-2026.jpg|shaita-angels-logo.png)";

/*
 * The admin sign-in background clips. Stable filenames, never content-hashed,
 * and a visitor can hit the login page repeatedly - so they get the same
 * week-long cache plus background revalidation as the photographs above.
 * Replacing a clip in place means shortening this header or renaming the file.
 */
const loginVideos = "/videos/:file(login-bg-1.mp4|login-bg-2.mp4|login-bg-3.mp4|login-bg-4.mp4)";

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
    return [
      {
        // Content-hashed build output: safe to cache for a year, immutable.
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        /*
         * Photographs under public/ with stable filenames. They are content, not
         * build output, so they get a long max-age plus stale-while-revalidate:
         * the cached copy is served instantly and any replacement is fetched in
         * the background on the next visit. If one of these is ever replaced
         * without renaming the file, shorten this header.
         */
        source: publicImages,
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
      {
        source: loginVideos,
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
      {
        // Everything else keeps the security headers. Listed last so the rules
        // above win for the paths they name.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
