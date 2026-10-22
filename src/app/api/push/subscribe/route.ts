import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { describeEndpoint, parseSubscribeBody } from "@/lib/push/endpoint";
import { isSameOrigin, readSmallJson } from "@/lib/push/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Saves a fan's push subscription and chosen topics. There are no accounts: the
 * endpoint is the identity, and saving again with the same endpoint replaces the
 * topics rather than adding a second row.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await readSmallJson(request);
  if (body === undefined) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const input = parseSubscribeBody(body);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });

  const client = createServiceClient();
  if (!client) return NextResponse.json({ error: "Match alerts are not available yet." }, { status: 503 });

  const { error } = await client.rpc("push_subscribe", {
    p_endpoint: input.endpoint,
    p_p256dh: input.p256dh,
    p_auth: input.auth,
    p_topics: input.topics,
  });
  if (error) {
    console.error("Push subscribe failed", describeEndpoint(input.endpoint), error.message);
    return NextResponse.json({ error: "We couldn't save your alerts. Try again." }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
