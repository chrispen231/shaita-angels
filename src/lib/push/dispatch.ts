import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALERT_FIXTURE_COLUMNS,
  buildMatchMessage,
  buildNewsMessage,
  scoreKey,
  type AlertArticle,
  type AlertFixture,
  type OutboxKind,
} from "@/lib/push/messages";
import { sendToTopic, type SendResult } from "@/lib/push/send";

/**
 * One run of the alert dispatcher, called every minute by the database's
 * scheduler through POST /api/push/dispatch.
 *
 * Claiming happens in the database (push_claim_kickoff_reminders, push_claim_due),
 * atomically, so two overlapping runs can never send the same alert twice. Each
 * claimed item re-reads the fixture or article as it is NOW and builds the alert
 * from that, which is how a corrected score or a muted match sends nothing.
 */

type OutboxRow = { id: string; kind: OutboxKind; fixture_id: string | null; article_id: string | null; send_after?: string };

export type DispatchSummary = { reminders: number; processed: number; sent: number; skipped: number };

export async function runDispatch(
  client: SupabaseClient,
  send: typeof sendToTopic = sendToTopic,
): Promise<DispatchSummary> {
  const summary: DispatchSummary = { reminders: 0, processed: 0, sent: 0, skipped: 0 };
  const deliver = async (message: Parameters<typeof sendToTopic>[2]) => {
    const result: SendResult = await send(client, message.topic, message);
    summary.sent += result.sent;
  };

  const { data: reminders, error: reminderError } = await client.rpc("push_claim_kickoff_reminders");
  if (reminderError) console.error("Kick-off reminder claim failed", reminderError.message);
  for (const { fixture_id } of (reminders ?? []) as { fixture_id: string }[]) {
    const fixture = await readFixture(client, fixture_id);
    const message = fixture && buildMatchMessage("kickoff_reminder", fixture);
    if (!message) {
      summary.skipped += 1;
      continue;
    }
    summary.reminders += 1;
    await deliver(message);
  }

  const { data: due, error: dueError } = await client.rpc("push_claim_due", { p_limit: 50 });
  if (dueError) {
    console.error("Push outbox claim failed", dueError.message);
    return summary;
  }

  const rows = ((due ?? []) as OutboxRow[]).sort((a, b) => (a.send_after ?? "").localeCompare(b.send_after ?? ""));
  const processed: string[] = [];
  for (const row of rows) {
    processed.push(row.id);
    summary.processed += 1;

    if (row.kind === "news") {
      const article = row.article_id ? await readArticle(client, row.article_id) : null;
      const message = article && buildNewsMessage(article);
      if (!message) summary.skipped += 1;
      else await deliver(message);
      continue;
    }

    const fixture = row.fixture_id ? await readFixture(client, row.fixture_id) : null;
    const message = fixture && buildMatchMessage(row.kind, fixture);
    if (!fixture || !message) {
      summary.skipped += 1;
      continue;
    }
    await deliver(message);
    const { error } = await client.rpc("push_record_alert", {
      p_fixture_id: fixture.id,
      p_kind: row.kind,
      p_score: scoreKey(fixture),
    });
    if (error) console.error("Recording a sent alert failed", error.message);
  }

  if (processed.length) {
    const { error } = await client.rpc("push_mark_sent", { p_ids: processed });
    if (error) console.error("Marking alerts sent failed", error.message);
  }
  return summary;
}

async function readFixture(client: SupabaseClient, id: string): Promise<AlertFixture | null> {
  const { data, error } = await client.from("fixtures").select(ALERT_FIXTURE_COLUMNS).eq("id", id).maybeSingle();
  if (error) console.error("Alert fixture read failed", error.message);
  return (data as AlertFixture | null) ?? null;
}

async function readArticle(client: SupabaseClient, id: string): Promise<AlertArticle | null> {
  const { data, error } = await client.from("articles").select("id, slug, title, is_published").eq("id", id).maybeSingle();
  if (error) console.error("Alert article read failed", error.message);
  return (data as AlertArticle | null) ?? null;
}
