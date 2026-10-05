import { cache } from "react";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { builtInCompetitions, type Competition } from "@/lib/reference-data";

/**
 * Server-only read of the competition list.
 *
 * Split from src/lib/reference-data.ts because that module is imported by client
 * components (position dropdowns, filter controls) and therefore must not reach
 * next/headers, which this file does via ./supabase/server.
 *
 * Cached per request: an admin page with several dropdowns should not run the same
 * query once per dropdown.
 */
export const getCompetitionsForAdmin = cache(async (): Promise<Competition[]> => {
  if (!getSupabaseConfig()) return builtInCompetitions();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitions")
    .select("slug, name, short_name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    // A missing competitions table must not empty every dropdown on the site. The
    // built-in list carries the same three competitions, so the fallback is
    // complete rather than partial.
    console.error("Competition read failed, using the built-in list", error.message);
    return builtInCompetitions();
  }

  return (data ?? []).map((row) => ({
    slug: String(row.slug),
    name: String(row.name),
    short: String(row.short_name),
  }));
});
