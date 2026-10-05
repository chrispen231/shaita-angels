import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { SiteSettings, SocialHandle, Sponsor } from "@/types/sponsors";

export { sponsorLogoUrl } from "@/lib/sponsors/logo-url";

/**
 * Public reads for the sponsor band and social row.
 *
 * Both queries rely on the RLS policies written in the Phase 1 migration: a
 * published sponsor is only visible while its contract window is open, and the
 * expiry check is duplicated here so a stale cached render cannot keep showing a
 * lapsed sponsor for long.
 */

const SPONSOR_COLUMNS =
  "id, name, tier, url, logo_path, alt_text, starts_on, ends_on, sort_order, is_published, created_at, updated_at";

export async function getActiveSponsors(): Promise<Sponsor[] | null> {
  if (!getSupabaseConfig()) return null;

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("sponsors")
    .select(SPONSOR_COLUMNS)
    .eq("is_published", true)
    .or(`starts_on.is.null,starts_on.lte.${today}`)
    .or(`ends_on.is.null,ends_on.gte.${today}`)
    .order("tier", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return [];
  return (data ?? []) as Sponsor[];
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  if (!getSupabaseConfig()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("social_handles, contact_email, phone_orders")
    .eq("id", true)
    .maybeSingle();

  if (error || !data) {
    return { social_handles: [], contact_email: null, phone_orders: null };
  }

  return normaliseSettings(data as SiteSettings);
}

/**
 * The social_handles column is jsonb, so its shape is validated on read rather
 * than by a database constraint. A malformed entry is dropped rather than
 * rendered, and a bad row never breaks the footer.
 */
function normaliseSettings(raw: SiteSettings): SiteSettings {
  const handles: SocialHandle[] = Array.isArray(raw.social_handles)
    ? raw.social_handles
        .filter(
          (entry): entry is SocialHandle =>
            typeof entry === "object" &&
            entry !== null &&
            typeof (entry as SocialHandle).platform === "string" &&
            typeof (entry as SocialHandle).url === "string" &&
            /^https?:\/\//i.test((entry as SocialHandle).url),
        )
        .map((entry) => ({
          platform: entry.platform,
          url: entry.url,
          label: typeof entry.label === "string" && entry.label ? entry.label : entry.platform,
          is_published: entry.is_published !== false,
        }))
    : [];

  return {
    social_handles: handles,
    contact_email: raw.contact_email ?? null,
    phone_orders: raw.phone_orders ?? null,
  };
}
