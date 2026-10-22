import { createClient } from "@/lib/supabase/server";
import { auditDateBounds } from "@/lib/admin/audit-range";
import type { AuditActorRole, AuditTargetType } from "@/lib/admin/audit-types";

/*
 * Deliberately not a "use server" module, so the reader below is not a server
 * action any browser could call; only the audit route, which checks the role,
 * uses it.
 *
 * Nothing in the app writes to the log. Database triggers do, through
 * audit_write() (20261022130000_audit_triggers.sql), so an entry cannot be
 * skipped or attributed to someone else.
 */

export interface AdminAuditEntry {
  actor_email: string;
  actor_role: AuditActorRole;
  target_type: AuditTargetType;
  target_id: string;
  action: string;
  details?: Record<string, unknown>;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

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
