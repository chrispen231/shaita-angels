import { NextRequest, NextResponse } from "next/server";
import { canAccess, getAdminContext } from "@/lib/admin/roles";
import { getAdminAuditLog, type AdminAuditEntry } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const context = await getAdminContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Same answer as a missing route, matching requireScreen on the page.
  if (!canAccess(context.role, "audit")) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const { data, error, count } = await getAdminAuditLog({
    actor_email: searchParams.get("actor_email") || undefined,
    target_type: (searchParams.get("target_type") || undefined) as AdminAuditEntry["target_type"] | undefined,
    target_id: searchParams.get("target_id") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    limit: Number(searchParams.get("limit") ?? 50),
    offset: Number(searchParams.get("offset") ?? 0),
  });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ data, count });
}
