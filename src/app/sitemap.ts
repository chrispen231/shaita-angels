import type { MetadataRoute } from "next";
import { articles } from "@/data/site";

const BASE_URL = "https://shaita-angels.vercel.app";

export const dynamic = "force-static";

/** Public routes only. /admin, /admin/login and /admin/password are never listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

  const routes: { path: string; changeFrequency: ChangeFrequency; priority: number }[] = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/team", changeFrequency: "monthly", priority: 0.9 },
    { path: "/matches", changeFrequency: "daily", priority: 0.9 },
    { path: "/news", changeFrequency: "weekly", priority: 0.8 },
    { path: "/club", changeFrequency: "monthly", priority: 0.7 },
    { path: "/media", changeFrequency: "monthly", priority: 0.6 },
    { path: "/community", changeFrequency: "monthly", priority: 0.6 },
    { path: "/tickets", changeFrequency: "weekly", priority: 0.6 },
    { path: "/shop", changeFrequency: "monthly", priority: 0.6 },
  ];

  const staticRoutes: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/news/${article.slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...articleRoutes];
}