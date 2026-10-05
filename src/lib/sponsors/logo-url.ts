/**
 * Sponsor logo resolution.
 *
 * Server-free by design: the admin editor is a client component and needs the
 * same resolver the public band uses, so both render identically and a
 * contributor sees what a visitor will see.
 *
 * Resolution order:
 *   1. an absolute http(s) URL, used as-is
 *   2. a bundled file in public/sponsors, matched by file name
 *   3. the sponsor-logos bucket in Supabase Storage
 *   4. bundled artwork matched on the sponsor's name
 *   5. nothing, and the caller renders a text fallback
 *
 * Step 2 exists because the club's artwork is bundled with the site rather than
 * uploaded, so an admin who types "bettomax.png" into the logo field gets that
 * image rather than a broken link to a bucket that does not exist yet. Step 4
 * matches on a normalised name so casing and spacing differences do not silently
 * drop a sponsor to the text placeholder.
 */

/** Artwork bundled with the site, keyed by the sponsor name it belongs to. */
const BUNDLED_BY_NAME: Record<string, string> = {
  bettomax: "/sponsors/bettomax.png",
  "neev liberia": "/sponsors/neev.png",
  neev: "/sponsors/neev.png",
  ambivert: "/sponsors/ambivert.png",
  "tlion estate": "/sponsors/tlion-estate.png",
};

/** Bundled file names, so a logo_path can point at one directly. */
const BUNDLED_FILES = new Set([
  "bettomax.png",
  "neev.png",
  "ambivert.png",
  "tlion-estate.png",
]);

/** Case- and spacing-insensitive key for a sponsor name. */
function normaliseName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveSponsorLogo(sponsor: {
  name: string;
  logo_path: string | null;
}): string | null {
  const path = sponsor.logo_path?.trim();

  if (path) {
    if (/^https?:\/\//i.test(path)) return path;

    const file = path.split("/").pop()?.toLowerCase() ?? "";
    if (BUNDLED_FILES.has(file)) return `/sponsors/${file}`;

    const stored = storageUrl(path);
    if (stored) return stored;
  }

  return BUNDLED_BY_NAME[normaliseName(sponsor.name)] ?? null;
}

function storageUrl(logoPath: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/sponsor-logos/${logoPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

/** True when the sponsor has artwork available, so callers can skip the text slot. */
export function hasSponsorLogo(sponsor: {
  name: string;
  logo_path: string | null;
}): boolean {
  return resolveSponsorLogo(sponsor) !== null;
}

/** @deprecated Use resolveSponsorLogo, which falls back to bundled artwork. */
export function sponsorLogoUrl(logoPath: string | null): string | null {
  if (!logoPath) return null;
  if (/^https?:\/\//i.test(logoPath)) return logoPath;
  const file = logoPath.split("/").pop()?.toLowerCase() ?? "";
  if (BUNDLED_FILES.has(file)) return `/sponsors/${file}`;
  return storageUrl(logoPath);
}
