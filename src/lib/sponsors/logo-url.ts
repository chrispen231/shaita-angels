/**
 * Public URL for a sponsor logo stored in the sponsor-logos bucket.
 *
 * Deliberately kept free of any server-only import so client components (the
 * admin preview form) can use it. `process.env.NEXT_PUBLIC_*` is inlined at
 * build time, so reading it here is safe on both sides of the boundary.
 *
 * It lives apart from lib/sponsors.ts because that module reads Supabase and so
 * reaches `next/headers`, which cannot cross into a client bundle.
 */
export function sponsorLogoUrl(logoPath: string | null): string | null {
  if (!logoPath) return null;
  if (/^https?:\/\//i.test(logoPath)) return logoPath;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/sponsor-logos/${logoPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}