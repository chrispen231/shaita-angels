import { describe, it, expect, afterEach } from "vitest";
import { sponsorLogoUrl } from "@/lib/sponsors/logo-url";
import {
  SPONSOR_TIER_LABELS,
  SOCIAL_PLATFORMS,
  type SocialHandle,
  type Sponsor,
  type SponsorTier,
} from "@/types/sponsors";

function makeSponsor(overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    id: "a",
    name: "BETTOMAX",
    tier: 1,
    url: "https://bettomax-lbr.com",
    logo_path: null,
    alt_text: null,
    starts_on: null,
    ends_on: null,
    sort_order: 10,
    is_published: true,
    created_at: "2026-10-05T00:00:00Z",
    updated_at: "2026-10-05T00:00:00Z",
    ...overrides,
  };
}

describe("sponsorLogoUrl", () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = original;
  });

  it("returns null when there is no path", () => {
    expect(sponsorLogoUrl(null)).toBeNull();
    expect(sponsorLogoUrl("")).toBeNull();
  });

  it("passes an absolute url straight through", () => {
    expect(sponsorLogoUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
  });

  it("builds a public storage url from a bucket path", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    expect(sponsorLogoUrl("bettomax.png")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/sponsor-logos/bettomax.png",
    );
  });

  it("tolerates a trailing slash on the project url", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co/";
    expect(sponsorLogoUrl("a.png")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/sponsor-logos/a.png",
    );
  });

  it("encodes each path segment", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    expect(sponsorLogoUrl("my logos/neev logo.png")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/sponsor-logos/my%20logos/neev%20logo.png",
    );
  });

  it("returns null when Supabase is not configured", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(sponsorLogoUrl("bettomax.png")).toBeNull();
  });
});

describe("sponsor tiers", () => {
  it("labels every tier", () => {
    const tiers: SponsorTier[] = [1, 2, 3];
    for (const tier of tiers) {
      expect(SPONSOR_TIER_LABELS[tier]).toBeTruthy();
    }
  });
});

describe("social handles", () => {
  it("exposes the platforms the club uses", () => {
    const slugs = SOCIAL_PLATFORMS.map((p) => p.slug);
    expect(slugs).toContain("facebook");
    expect(slugs).toContain("instagram");
    expect(slugs).toContain("youtube");
    expect(slugs).toContain("whatsapp");
  });

  it("every platform has a human label, for the accessible name", () => {
    for (const platform of SOCIAL_PLATFORMS) {
      expect(platform.label).toBeTruthy();
      expect(platform.label).not.toBe(platform.slug);
    }
  });

  it("models a handle with the fields the band needs", () => {
    const handle: SocialHandle = {
      platform: "facebook",
      url: "https://web.facebook.com/shaitaangelsfc",
      label: "Facebook",
      is_published: true,
    };
    expect(handle.platform).toBe("facebook");
    expect(handle.is_published).toBe(true);
  });
});