import { describe, it, expect } from "vitest";
import {
  ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  SCREEN_ACCESS,
  canAccess,
  isRole,
  type Role,
  type ScreenKey,
} from "@/lib/admin/role-constants";

/**
 * The access matrix is the app's only expression of who can reach what, so it is
 * worth pinning down. RLS is the real boundary; this catches a matrix that drifts
 * from what the migrations actually grant.
 */

describe("roles", () => {
  it("has exactly the three agreed roles", () => {
    expect(ROLES).toEqual(["super_admin", "fixtures", "content"]);
  });

  it("labels and describes every role", () => {
    for (const role of ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
      expect(ROLE_DESCRIPTIONS[role]).toBeTruthy();
    }
  });

  it("validates role strings", () => {
    expect(isRole("super_admin")).toBe(true);
    expect(isRole("fixtures")).toBe(true);
    expect(isRole("content")).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe("screen access", () => {
  it("restricts sponsors, settings and users to super admin", () => {
    // Sponsorship is commercially sensitive and not editorial content.
    for (const screen of ["sponsors", "settings", "users"] as ScreenKey[]) {
      expect(SCREEN_ACCESS[screen]).toEqual(["super_admin"]);
    }
  });

  it("lets super admin reach everything", () => {
    for (const screen of Object.keys(SCREEN_ACCESS) as ScreenKey[]) {
      expect(canAccess("super_admin", screen)).toBe(true);
    }
  });

  it("keeps a content admin out of fixtures and sponsors", () => {
    expect(canAccess("content", "news")).toBe(true);
    expect(canAccess("content", "squad")).toBe(true);
    expect(canAccess("content", "fixtures")).toBe(false);
    expect(canAccess("content", "sponsors")).toBe(false);
    expect(canAccess("content", "users")).toBe(false);
  });

  it("keeps a fixtures admin out of editorial screens", () => {
    expect(canAccess("fixtures", "fixtures")).toBe(true);
    expect(canAccess("fixtures", "matches")).toBe(true);
    expect(canAccess("fixtures", "news")).toBe(false);
    expect(canAccess("fixtures", "sponsors")).toBe(false);
  });

  it("gives every non-super role the shared media library", () => {
    expect(canAccess("content", "media")).toBe(true);
    expect(canAccess("fixtures", "media")).toBe(true);
  });

  it("never grants a screen to an unknown role", () => {
    const screens = Object.keys(SCREEN_ACCESS) as ScreenKey[];
    for (const screen of screens) {
      expect(SCREEN_ACCESS[screen].length).toBeGreaterThan(0);
      for (const role of SCREEN_ACCESS[screen]) {
        expect(ROLES).toContain(role as Role);
      }
    }
  });
});
