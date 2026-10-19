"use server";

import { createClient } from "@/lib/supabase/server";

export interface AdminAuditEntry {
  actor_email: string;
  actor_role: "super_admin" | "fixtures" | "content";
  target_type: "fixture" | "match_content" | "news" | "sponsor" | "site_settings" | "user" | "media" | "staff" | "honour" | "squad";
  target_id: string;
  action: string;
  details?: Record<string, unknown>;
}

export async function logAdminAction(entry: AdminAuditEntry): Promise<{ error: string | null }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("admin_audit_log")
    .insert({
      actor_email: entry.actor_email,
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
  
  let query = supabase
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (options.actor_email) query = query.eq("actor_email", options.actor_email);
  if (options.target_type) query = query.eq("target_type", options.target_type);
  if (options.target_id) query = query.eq("target_id", options.target_id);
  if (options.from) query = query.gte("created_at", options.from);
  if (options.to) query = query.lte("created_at", options.to);
  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("admin_audit_log select failed:", error);
    return { data: null, error: "Failed to load audit log", count: 0 };
  }
  return { data: data ?? [], error: null, count: count ?? 0 };
}