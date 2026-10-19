import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only super_admin can read
  const { data: role } = await supabase.rpc("has_role", { role_name: "super_admin" });
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const actor_email = searchParams.get("actor_email") || undefined;
  const target_type = searchParams.get("target_type") || undefined;
  const target_id = searchParams.get("target_id") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  let query = supabase
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (actor_email) query = query.eq("actor_email", actor_email);
  if (target_type) query = query.eq("target_type", target_type);
  if (target_id) query = query.eq("target_id", target_id);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  return NextResponse.json({ data: data ?? [], count: count ?? 0 });
}