import { createClient } from "./server";

export async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("site_admins")
    .select("email")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  if (membershipError || !membership) return null;
  return { supabase, user };
}
