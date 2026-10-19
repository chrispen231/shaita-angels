import { describe, expect, it } from "vitest";
import { validateLeadership, type LeadershipInput } from "@/lib/leadership-validation";

const valid: LeadershipInput = {
  full_name: "Grace Doe",
  role: "President",
  bio: "Guiding the club.",
  photo_url: "https://cdn.example.com/grace.jpg",
  photo_alt: "Grace Doe, club president",
  sort_order: 0,
};

describe("validateLeadership", () => {
  it("accepts a complete leadership profile", () => {
    expect(validateLeadership(valid)).toBeNull();
  });

  it("allows no photo and a first position in a relative URL", () => {
    expect(validateLeadership({ ...valid, photo_url: null, sort_order: 9999 })).toBeNull();
    expect(validateLeadership({ ...valid, photo_url: "/club/president.jpg" })).toBeNull();
  });

  it("requires a name and position", () => {
    expect(validateLeadership({ ...valid, full_name: " " })).toMatch(/name is required/i);
    expect(validateLeadership({ ...valid, role: "" })).toMatch(/position is required/i);
  });

  it("rejects oversized text and invalid sort order", () => {
    expect(validateLeadership({ ...valid, bio: "x".repeat(2401) })).toMatch(/2,400/);
    expect(validateLeadership({ ...valid, sort_order: 1.5 })).toMatch(/whole number/);
    expect(validateLeadership({ ...valid, sort_order: -1 })).toMatch(/whole number/);
  });

  it("rejects insecure or protocol-relative photo URLs", () => {
    expect(validateLeadership({ ...valid, photo_url: "http://example.com/photo.jpg" })).toMatch(/HTTPS/);
    expect(validateLeadership({ ...valid, photo_url: "//example.com/photo.jpg" })).toMatch(/HTTPS/);
    expect(validateLeadership({ ...valid, photo_url: "javascript:alert(1)" })).toMatch(/HTTPS/);
  });
});
