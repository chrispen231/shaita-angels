import { cache } from "react";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { articles as seedArticles, honors as seedHonors } from "@/data/site";

/**
 * Public content: articles, honours and the squad list.
 *
 * Every reader falls back to the values in src/data/site.ts when Supabase is not
 * configured. That is not a convenience: the site must build and render without
 * credentials, and a local checkout has none. The fallback also means a database
 * problem degrades to the last known good content rather than an empty page, which
 * for a club site is much better than a blank newsroom.
 *
 * Once Supabase IS configured, the database is the only source. The two are seeded
 * identically in 20261005160000_content.sql, so switching between them changes
 * nothing visible - which is exactly what makes the fallback safe.
 */

export type Article = {
  slug: string;
  category: string;
  /** ISO date. Rendered in the club's long form by formatArticleDate. */
  date: string;
  title: string;
  excerpt: string;
  image: string | null;
  imageAlt: string | null;
  body: string[];
  isFeatured: boolean;
};

export type Honor = {
  year: string;
  name: string;
  detail: string | null;
};

export type SquadPlayer = {
  /** Squad number, used as the public profile URL segment. */
  number: number;
  name: string;
  position: string;
  photo: string | null;
  photoAlt: string | null;
  bio: string | null;
};

// =============================================================================
// Date formatting
// =============================================================================

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Renders an ISO date in the club's existing long form: "14 July 2026".
 *
 * Built from the parts rather than through Date, so the output never shifts with
 * the server's timezone. `new Date("2026-07-14").toLocaleDateString()` renders the
 * 13th west of UTC, which is the kind of bug that only shows up in production.
 */
export function formatArticleDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;

  const [, year, month, day] = match;
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) return iso;

  return `${Number(day)} ${monthName} ${year}`;
}

// =============================================================================
// Articles
// =============================================================================

function fromSeedArticles(): Article[] {
  return seedArticles.map((article) => ({
    slug: article.slug,
    category: article.category,
    date: article.date,
    title: article.title,
    excerpt: article.excerpt,
    image: article.image,
    imageAlt: article.imageAlt,
    body: article.body,
    isFeatured: false,
  }));
}

/**
 * Published articles, newest first.
 *
 * Ties are broken by sort_order then slug so the order is stable: two articles
 * published on the same day must not swap places between requests.
 */
export const getArticles = cache(async (): Promise<Article[]> => {
  if (!getSupabaseConfig()) return fromSeedArticles();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select("slug, category, published_on, title, excerpt, image_path, image_alt, body, is_featured")
    .eq("is_published", true)
    .order("published_on", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });

  if (error) {
    console.error("Article read failed, serving seed content", error.message);
    return fromSeedArticles();
  }

  return (data ?? []).map((row) => ({
    slug: String(row.slug),
    category: String(row.category),
    date: String(row.published_on),
    title: String(row.title),
    excerpt: String(row.excerpt),
    image: row.image_path === null ? null : String(row.image_path),
    imageAlt: row.image_alt === null ? null : String(row.image_alt),
    body: Array.isArray(row.body) ? row.body.map(String) : [],
    isFeatured: Boolean(row.is_featured),
  }));
});

export const getArticleBySlug = cache(async (slug: string): Promise<Article | null> => {
  const articles = await getArticles();
  return articles.find((article) => article.slug === slug) ?? null;
});

// =============================================================================
// Honours
// =============================================================================

function fromSeedHonors(): Honor[] {
  return seedHonors.map((honor) => ({
    year: honor.year,
    name: honor.name,
    detail: honor.detail,
  }));
}

export const getHonors = cache(async (): Promise<Honor[]> => {
  if (!getSupabaseConfig()) return fromSeedHonors();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("honors")
    .select("year_label, name, detail")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Honours read failed, serving seed content", error.message);
    return fromSeedHonors();
  }

  return (data ?? []).map((row) => ({
    year: String(row.year_label),
    name: String(row.name),
    detail: row.detail === null ? null : String(row.detail),
  }));
});

// =============================================================================
// Squad
// =============================================================================

/**
 * The published squad, ordered by shirt number.
 *
 * date_of_birth is NOT selected. anon has no grant on that column, so a query
 * including it would fail with permission denied rather than return a null. The
 * public profile shows what is published and nothing else; age is a Phase 4
 * follow-up, because rendering an age correctly for a minor needs a decision about
 * whose decision it is to publish one.
 */
export const getSquad = cache(async (): Promise<SquadPlayer[]> => {
  if (!getSupabaseConfig()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("squad")
    .select("id, full_name, position, shirt_number, photo_url, bio")
    .eq("is_published", true)
    .order("shirt_number", { ascending: true, nullsFirst: false })
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Squad read failed", error.message);
    return [];
  }

  return (data ?? [])
    // A published player with no squad number cannot have a profile URL, because
    // the route is /team/player/[number]. Filtering here keeps every returned
    // player reachable rather than linking to a dead page.
    .filter((row) => row.shirt_number !== null)
    .map((row) => ({
      number: Number(row.shirt_number),
      name: String(row.full_name),
      position: String(row.position ?? "Player"),
      photo: row.photo_url === null ? null : String(row.photo_url),
      photoAlt: row.photo_url === null ? null : `${String(row.full_name)} in Shaita Angels colours`,
      bio: row.bio === null ? null : String(row.bio),
    }));
});

export const getSquadPlayer = cache(async (number: number): Promise<SquadPlayer | null> => {
  const squad = await getSquad();
  return squad.find((player) => player.number === number) ?? null;
});

/** The distinct positions present, in the order the squad page shows them. */
export const POSITION_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Forward"] as const;

export function positionsInUse(squad: SquadPlayer[]): string[] {
  const present = new Set(squad.map((player) => player.position));
  const ordered = POSITION_ORDER.filter((position) => present.has(position));
  // Any position the club has invented, kept after the known four.
  const extra = [...present].filter((position) => !POSITION_ORDER.includes(position as never)).sort();
  return [...ordered, ...extra];
}
