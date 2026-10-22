import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client, for server code that must act without a signed-in
 * admin: the push subscribe endpoint and the alert dispatcher.
 *
 * The service role bypasses RLS, so this must never reach a browser bundle. The
 * guard below fails loudly if it is ever imported client-side. Returns null when
 * the URL or SUPABASE_SERVICE_ROLE_KEY is missing, so callers can degrade.
 */
export function createServiceClient(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    throw new Error("createServiceClient is server-only.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
