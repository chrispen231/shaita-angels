import { describe, it, expect, afterEach } from "vitest";
import { resolveSponsorLogo, hasSponsorLogo, sponsorLogoUrl } from "@/lib/sponsors/logo-url";
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

  it("prefers a bundled file over the storage bucket", () => {
    // A bundled file name resolves locally rather than to storage, so an admin
    // who types a bundled file name does not get a broken bucket link.
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    expect(sponsorLogoUrl("bettomax.png")).toBe("/sponsors/bettomax.png");
  });

  it("builds a public storage url for an unknown file", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    expect(sponsorLogoUrl("uploads/custom.png")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/sponsor-logos/uploads/custom.png",
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

  it("returns null for an unknown file when Supabase is not configured", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(sponsorLogoUrl("uploads/custom.png")).toBeNull();
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
describe("resolveSponsorLogo", () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = original;
  });

  it("matches bundled artwork on the sponsor name when no path is set", () => {
    expect(resolveSponsorLogo({ name: "BETTOMAX", logo_path: null })).toBe("/sponsors/bettomax.png");
    expect(resolveSponsorLogo({ name: "NEEV Liberia", logo_path: null })).toBe("/sponsors/neev.png");
    expect(resolveSponsorLogo({ name: "Ambivert", logo_path: null })).toBe("/sponsors/ambivert.png");
  });

  it("ignores case and extra spacing in the name", () => {
    // This is the bug: an admin adding "AMBIVERT" got the text placeholder
    // because the old lookup was keyed on an exact string.
    expect(resolveSponsorLogo({ name: "AMBIVERT", logo_path: null })).toBe("/sponsors/ambivert.png");
    expect(resolveSponsorLogo({ name: "  neev   liberia ", logo_path: null })).toBe("/sponsors/neev.png");
  });

  it("resolves a bundled file name from logo_path", () => {
    expect(resolveSponsorLogo({ name: "Anything", logo_path: "bettomax.png" })).toBe("/sponsors/bettomax.png");
    expect(resolveSponsorLogo({ name: "Anything", logo_path: "/logos/neev.png" })).toBe("/sponsors/neev.png");
  });

  it("passes an absolute url through unchanged", () => {
    expect(resolveSponsorLogo({ name: "X", logo_path: "https://cdn.example.com/a.png" })).toBe(
      "https://cdn.example.com/a.png",
    );
  });

  it("falls back to storage for an unknown file", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    expect(resolveSponsorLogo({ name: "X", logo_path: "uploads/custom.png" })).toBe(
      "https://abc.supabase.co/storage/v1/object/public/sponsor-logos/uploads/custom.png",
    );
  });

  it("returns null for a sponsor with no artwork anywhere", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    expect(resolveSponsorLogo({ name: "Unknown Brand", logo_path: null })).toBeNull();
    expect(hasSponsorLogo({ name: "Unknown Brand", logo_path: null })).toBe(false);
  });

  it("reports artwork availability", () => {
    expect(hasSponsorLogo({ name: "TLION ESTATE", logo_path: null })).toBe(true);
    expect(hasSponsorLogo({ name: "BETTOMAX", logo_path: null })).toBe(true);
  });
});
