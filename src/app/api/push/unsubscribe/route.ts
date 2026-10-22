import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { describeEndpoint, isAllowedPushEndpoint } from "@/lib/push/endpoint";
import { isSameOrigin, readSmallJson } from "@/lib/push/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Removes a subscription. Unknown endpoints succeed too: the outcome is the same. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await readSmallJson(request);
  const endpoint = (body as { endpoint?: unknown } | undefined)?.endpoint;
  if (typeof endpoint !== "string" || !isAllowedPushEndpoint(endpoint)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const client = createServiceClient();
  if (!client) return NextResponse.json({ error: "Match alerts are not available yet." }, { status: 503 });

  const { error } = await client.rpc("push_unsubscribe", { p_endpoint: endpoint });
  if (error) {
    console.error("Push unsubscribe failed", describeEndpoint(endpoint), error.message);
    return NextResponse.json({ error: "We couldn't turn off your alerts. Try again." }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
