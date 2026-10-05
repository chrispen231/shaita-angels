import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Roles for the admin section.
 *
 * Mirrors the `role` CHECK constraint added in
 * supabase/migrations/20261005130000_admin_roles.sql.
 *
 * The role read here is for *presentation*: hiding nav links, choosing which
 * screen to render. It is not the security boundary. The boundary is RLS plus
 * the column-level grants that withhold `role` from non-super admins, because
 * RLS cannot restrict which columns a caller updates and a client can always be
 * made to call an endpoint by hand.
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

export type AdminContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email: string };
  role: Role;
};

/** The role column is typed text in the database; validate before trusting it. */
function toRole(value: unknown): Role {
  return ROLES.includes(value as Role) ? (value as Role) : "content";
}

/**
 * Returns the signed-in admin and their role, or null when Supabase is
 * unconfigured or the email is not on the allowlist.
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  if (!getSupabaseConfig()) return null;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("site_admins")
    .select("email, role")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  if (membershipError || !membership) return null;

  return {
    supabase,
    user: { id: user.id, email: user.email },
    role: toRole(membership.role),
  };
}

/** Screen access, matching the policies in the Phase 2 migration. */
export const SCREEN_ACCESS = {
  sponsors: ["super_admin"],
  settings: ["super_admin"],
  users: ["super_admin"],
  fixtures: ["super_admin", "fixtures"],
  matches: ["super_admin", "fixtures"],
  news: ["super_admin", "content"],
  squad: ["super_admin", "content"],
  honors: ["super_admin", "content"],
  media: ["super_admin", "fixtures", "content"],
} as const satisfies Record<string, readonly Role[]>;

export type ScreenKey = keyof typeof SCREEN_ACCESS;

export function canAccess(role: Role, screen: ScreenKey): boolean {
  return (SCREEN_ACCESS[screen] as readonly Role[]).includes(role);
}