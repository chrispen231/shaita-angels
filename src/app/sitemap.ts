import type { MetadataRoute } from "next";
import { getArticles, getSquad } from "@/lib/content";

const BASE_URL = "https://shaita-angels.vercel.app";

// Reads the database, so it cannot be prerendered: a static build has no
// Supabase credentials and would either fail or bake in an empty newsroom.
export const dynamic = "force-dynamic";

/**
 * Dynamic rather than force-static.
 *
 * Articles and players live in the database and change without a deploy. A static
 * sitemap would keep listing articles the club has unpublished and omit ones they
 * have just published, which is worse than no sitemap at all.
 */

/** Public routes only. /admin, /admin/login and /admin/password are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const [articles, squad] = await Promise.all([getArticles(), getSquad()]);

  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/news/${article.slug}`,
    lastModified: new Date(`${article.date}T00:00:00Z`),
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  // Player profiles are public pages and were previously absent from the sitemap
  // entirely, because they were generated from a static list.
  const playerRoutes: MetadataRoute.Sitemap = squad.map((player) => ({
    url: `${BASE_URL}/team/player/${player.number}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  return [...staticRoutes, ...articleRoutes, ...playerRoutes];
}
