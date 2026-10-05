import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isRole, type Role } from "@/lib/admin/role-constants";

/**
 * Server-side admin context.
 *
 * The role read here is for presentation: hiding nav links and choosing which
 * screen to render. It is not the security boundary. The boundary is RLS plus the
 * role-guarded policies in the migrations, because RLS cannot be bypassed from
 * the browser and a client can always be made to call an endpoint by hand.
 *
 * Role names and labels live in role-constants.ts so client components can use
 * them without pulling in this module, which reaches `next/headers`.
 */

export {
  ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  SCREEN_ACCESS,
  canAccess,
  isRole,
  type Role,
  type ScreenKey,
} from "@/lib/admin/role-constants";

export type AdminContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email: string };
  role: Role;
};

/** The role column is typed text in the database; validate before trusting it. */
function toRole(value: unknown): Role {
  return isRole(value) ? value : "content";
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
