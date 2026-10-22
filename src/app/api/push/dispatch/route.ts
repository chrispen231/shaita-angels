import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runDispatch } from "@/lib/push/dispatch";
import { hasDispatchSecret } from "@/lib/push/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends due match alerts and kick-off reminders. Called every minute by the
 * push-dispatch pg_cron job (see 20261022140000_push_notifications.sql) with
 * `Authorization: Bearer $PUSH_DISPATCH_SECRET`. Anyone else gets a 401.
 */
export async function POST(request: Request) {
  if (!hasDispatchSecret(request, process.env.PUSH_DISPATCH_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createServiceClient();
  if (!client) return NextResponse.json({ error: "Service client is not configured." }, { status: 503 });

  const summary = await runDispatch(client);
  return NextResponse.json(summary);
}
