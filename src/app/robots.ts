import type { MetadataRoute } from "next";

const BASE_URL = "https://shaita-angels.vercel.app";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing behind the admin area should ever be indexed.
        disallow: ["/admin", "/admin/", "/auth/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}