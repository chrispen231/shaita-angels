/** Sponsor and site-settings types, mirroring the Phase 1 migration. */

export type SponsorTier = 1 | 2 | 3;

export const SPONSOR_TIER_LABELS: Record<SponsorTier, string> = {
  1: "Principal partner",
  2: "Partner",
  3: "Supplier",
};

export type Sponsor = {
  id: string;
  name: string;
  tier: SponsorTier;
  url: string | null;
  logo_path: string | null;
  alt_text: string | null;
  starts_on: string | null;
  ends_on: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export const SOCIAL_PLATFORMS = [
  { slug: "facebook", label: "Facebook" },
  { slug: "instagram", label: "Instagram" },
  { slug: "youtube", label: "YouTube" },
  { slug: "whatsapp", label: "WhatsApp" },
  { slug: "tiktok", label: "TikTok" },
  { slug: "x", label: "X" },
] as const;

export type SocialPlatformSlug = (typeof SOCIAL_PLATFORMS)[number]["slug"];

export type SocialHandle = {
  platform: string;
  url: string;
  label: string;
  is_published: boolean;
};

export type SiteSettings = {
  social_handles: SocialHandle[];
  contact_email: string | null;
  phone_orders: string | null;
};