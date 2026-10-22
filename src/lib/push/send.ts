import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describeEndpoint, type PushTopic } from "@/lib/push/endpoint";
import type { PushMessage } from "@/lib/push/messages";

/**
 * Delivers one alert to every subscriber of its topic.
 *
 * Subscriptions die quietly: an uninstalled app or revoked permission makes the
 * push service answer 404 or 410, and that subscription is deleted on the spot.
 * Any other failure counts against it, and five in a row remove it, so the table
 * cannot fill with endpoints that will never work again.
 */

const BATCH = 20;
const MAX_FAILURES = 5;

type SubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string; failure_count: number };

export type SendResult = { sent: number; removed: number; failed: number };

export function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export async function sendToTopic(client: SupabaseClient, topic: PushTopic, message: PushMessage): Promise<SendResult> {
  const result: SendResult = { sent: 0, removed: 0, failed: 0 };
  const vapid = getVapidConfig();
  if (!vapid) {
    console.error("Push not sent: VAPID keys are not configured");
    return result;
  }

  const { data, error } = await client
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, failure_count")
    .contains("topics", [topic]);
  if (error) {
    console.error("Push subscription read failed", error.message);
    return result;
  }

  const payload = JSON.stringify({ title: message.title, body: message.body, url: message.url, tag: message.tag });
  const options = {
    TTL: message.ttl,
    urgency: message.urgency,
    vapidDetails: { subject: vapid.subject, publicKey: vapid.publicKey, privateKey: vapid.privateKey },
  };

  const rows = (data ?? []) as SubscriptionRow[];
  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH);
    const outcomes = await Promise.allSettled(
      batch.map((row) =>
        webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload, options),
      ),
    );

    await Promise.all(
      outcomes.map(async (outcome, index) => {
        const row = batch[index];
        if (outcome.status === "fulfilled") {
          result.sent += 1;
          if (row.failure_count > 0) {
            await client.from("push_subscriptions").update({ failure_count: 0 }).eq("id", row.id);
          }
          return;
        }

        const status = (outcome.reason as { statusCode?: number })?.statusCode;
        const failures = row.failure_count + 1;
        if (status === 404 || status === 410 || failures >= MAX_FAILURES) {
          result.removed += 1;
          await client.from("push_subscriptions").delete().eq("id", row.id);
          return;
        }
        result.failed += 1;
        console.error("Push delivery failed", describeEndpoint(row.endpoint), status ?? "network error");
        await client.from("push_subscriptions").update({ failure_count: failures }).eq("id", row.id);
      }),
    );
  }

  return result;
}
