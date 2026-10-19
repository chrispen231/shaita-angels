export type LeadershipInput = {
  full_name: string;
  role: string;
  bio: string | null;
  photo_url: string | null;
  photo_alt: string | null;
  sort_order: number;
};

/** Validates admin-submitted profile data before it reaches Supabase. */
export function validateLeadership(input: LeadershipInput): string | null {
  if (!input.full_name.trim()) return "Full name is required.";
  if (input.full_name.length > 120) return "Full name must be 120 characters or fewer.";
  if (!input.role.trim()) return "Position is required.";
  if (input.role.length > 120) return "Position must be 120 characters or fewer.";
  if ((input.bio?.length ?? 0) > 2400) return "Biography must be 2,400 characters or fewer.";
  if ((input.photo_alt?.length ?? 0) > 250) return "Photo description must be 250 characters or fewer.";
  if (!Number.isInteger(input.sort_order) || input.sort_order < 0 || input.sort_order > 9999) {
    return "Sort order must be a whole number from 0 to 9,999.";
  }
  if (input.photo_url && input.photo_url.length > 2048) return "Photo URL is too long.";
  if (input.photo_url && !isSafeImageUrl(input.photo_url)) {
    return "Photo must use an HTTPS URL or a site-relative path.";
  }
  return null;
}

function isSafeImageUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
