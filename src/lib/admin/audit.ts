import { createClient } from "@/lib/supabase/server";
import { auditDateBounds } from "@/lib/admin/audit-range";

/*
 * Deliberately not a "use server" module. Exporting these from one would turn
 * both into server actions any browser could call directly; as plain server
 * functions they are reachable only through the admin actions and the audit
 * route, which check the admin's role first.
 */

export interface AdminAuditEntry {
  actor_email: string;
  actor_role: "super_admin" | "fixtures" | "content";
  target_type: "fixture" | "match_content" | "news" | "sponsor" | "site_settings" | "user" | "media" | "staff" | "honour" | "squad";
  target_id: string;
  action: string;
  details?: Record<string, unknown>;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export async function logAdminAction(entry: AdminAuditEntry): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // The insert policy compares actor_email with the lower-cased JWT email.
  const { error } = await supabase
    .from("admin_audit_log")
    .insert({
      actor_email: entry.actor_email.toLowerCase(),
      actor_role: entry.actor_role,
      target_type: entry.target_type,
      target_id: entry.target_id,
      action: entry.action,
      details: entry.details ?? null,
    });

  if (error) {
    console.error("admin_audit_log insert failed:", error);
    return { error: "Failed to record audit log" };
  }
  return { error: null };
}

export async function getAdminAuditLog(
  options: {
    actor_email?: string;
    target_type?: AdminAuditEntry["target_type"];
    target_id?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: unknown[] | null; error: string | null; count: number }> {
  const supabase = await createClient();

  const limit = Math.min(Math.max(1, Math.trunc(options.limit ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0) || 0);

  let query = supabase
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.actor_email) query = query.eq("actor_email", options.actor_email.toLowerCase());
  if (options.target_type) query = query.eq("target_type", options.target_type);
  if (options.target_id) query = query.eq("target_id", options.target_id);
  const bounds = auditDateBounds(options.from, options.to);
  if (bounds.gte) query = query.gte("created_at", bounds.gte);
  if (bounds.lt) query = query.lt("created_at", bounds.lt);
  if (bounds.lte) query = query.lte("created_at", bounds.lte);

  const { data, error, count } = await query;

  if (error) {
    console.error("admin_audit_log select failed:", error);
    return { data: null, error: "Failed to load audit log", count: 0 };
  }
  return { data: data ?? [], error: null, count: count ?? 0 };
}
