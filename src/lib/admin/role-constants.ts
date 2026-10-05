/**
 * Role names, labels and screen access.
 *
 * Server-free so client components can import them. lib/admin/roles.ts reads
 * Supabase and so reaches `next/headers`, which cannot cross into a client
 * bundle; the two files must agree, and the tests cover that.
 */

export const ROLES = ["super_admin", "fixtures", "content"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super admin",
  fixtures: "Fixtures",
  content: "Content",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Everything, including sponsors, settings and other admins.",
  fixtures: "Fixtures, matches, lineups, goals and cards.",
  content: "News, squad, honours and the media library.",
};

export type ScreenKey =
  | "sponsors"
  | "settings"
  | "users"
  | "fixtures"
  | "matches"
  | "news"
  | "squad"
  | "honors"
  | "media";

/** Screen access, matching the policies in the roles migrations. */
export const SCREEN_ACCESS: Record<ScreenKey, readonly Role[]> = {
  sponsors: ["super_admin"],
  settings: ["super_admin"],
  users: ["super_admin"],
  fixtures: ["super_admin", "fixtures"],
  matches: ["super_admin", "fixtures"],
  news: ["super_admin", "content"],
  squad: ["super_admin", "content"],
  honors: ["super_admin", "content"],
  media: ["super_admin", "fixtures", "content"],
};

export function canAccess(role: Role, screen: ScreenKey): boolean {
  return SCREEN_ACCESS[screen].includes(role);
}

export function isRole(value: unknown): value is Role {
  return (ROLES as readonly unknown[]).includes(value);
}
