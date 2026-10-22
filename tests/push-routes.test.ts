import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase, type FakeSupabase } from "./helpers/fake-supabase";

const state = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => state.client }));

const push = vi.hoisted(() => ({ sendNotification: vi.fn() }));
vi.mock("web-push", () => ({ default: push }));

import { POST as subscribe } from "@/app/api/push/subscribe/route";
import { POST as unsubscribe } from "@/app/api/push/unsubscribe/route";
import { POST as dispatch } from "@/app/api/push/dispatch/route";
import { runDispatch } from "@/lib/push/dispatch";
import type { SupabaseClient } from "@supabase/supabase-js";

const SITE = "http://localhost:3000";
const FCM = "https://fcm.googleapis.com/fcm/send/abc123";
const VALID = { subscription: { endpoint: FCM, keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) } }, topics: ["kickoff", "results"] };
const FIXTURE_ID = "11111111-1111-4111-8111-111111111111";

function post(path: string, body: unknown, headers: Record<string, string> = { origin: SITE }) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Request(`${SITE}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: text });
}

let fake: FakeSupabase;

beforeEach(() => {
  fake = createFakeSupabase();
  state.client = fake.client;
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
  vi.stubEnv("PUSH_DISPATCH_SECRET", "s3cret-value");
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
  vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
  vi.stubEnv("VAPID_SUBJECT", "mailto:club@example.org");
  push.sendNotification.mockReset().mockResolvedValue({ statusCode: 201 });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/push/subscribe", () => {
  it("saves a valid subscription through push_subscribe", async () => {
    const response = await subscribe(post("/api/push/subscribe", VALID));
    expect(response.status).toBe(204);
    expect(fake.rpcCalls).toEqual([
      {
        name: "push_subscribe",
        args: { p_endpoint: FCM, p_p256dh: "B".repeat(87), p_auth: "a".repeat(22), p_topics: ["kickoff", "results"] },
      },
    ]);
  });

  it("refuses a request from another site", async () => {
    expect((await subscribe(post("/api/push/subscribe", VALID, { origin: "https://evil.example" }))).status).toBe(403);
    expect((await subscribe(post("/api/push/subscribe", VALID, {}))).status).toBe(403);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("refuses an oversized or malformed body", async () => {
    expect((await subscribe(post("/api/push/subscribe", { ...VALID, padding: "x".repeat(5000) }))).status).toBe(400);
    expect((await subscribe(post("/api/push/subscribe", "{not json"))).status).toBe(400);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("refuses an endpoint outside the known push services", async () => {
    const response = await subscribe(post("/api/push/subscribe", { ...VALID, subscription: { ...VALID.subscription, endpoint: "https://example.com/hook" } }));
    expect(response.status).toBe(400);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("answers 503 when the service client is not configured", async () => {
    state.client = null;
    expect((await subscribe(post("/api/push/subscribe", VALID))).status).toBe(503);
  });

  it("does not leak the database error", async () => {
    fake.onRpc(() => ({ data: null, error: { message: "relation push_subscriptions does not exist" } }));
    const response = await subscribe(post("/api/push/subscribe", VALID));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("relation");
  });
});

describe("POST /api/push/unsubscribe", () => {
  it("removes the subscription", async () => {
    expect((await unsubscribe(post("/api/push/unsubscribe", { endpoint: FCM }))).status).toBe(204);
    expect(fake.rpcCalls).toEqual([{ name: "push_unsubscribe", args: { p_endpoint: FCM } }]);
  });

  it("validates origin and endpoint", async () => {
    expect((await unsubscribe(post("/api/push/unsubscribe", { endpoint: FCM }, { origin: "https://evil.example" }))).status).toBe(403);
    expect((await unsubscribe(post("/api/push/unsubscribe", { endpoint: "https://example.com/x" }))).status).toBe(400);
    expect(fake.rpcCalls).toHaveLength(0);
  });
});

describe("POST /api/push/dispatch", () => {
  it("requires the dispatch secret", async () => {
    expect((await dispatch(post("/api/push/dispatch", {}, {}))).status).toBe(401);
    expect((await dispatch(post("/api/push/dispatch", {}, { authorization: "Bearer wrong" }))).status).toBe(401);
    vi.stubEnv("PUSH_DISPATCH_SECRET", "");
    expect((await dispatch(post("/api/push/dispatch", {}, { authorization: "Bearer " }))).status).toBe(401);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("runs with the right secret", async () => {
    const response = await dispatch(post("/api/push/dispatch", {}, { authorization: "Bearer s3cret-value" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reminders: 0, processed: 0, sent: 0, skipped: 0 });
    expect(fake.rpcCalls.map((call) => call.name)).toEqual(["push_claim_kickoff_reminders", "push_claim_due"]);
  });
});

describe("runDispatch", () => {
  const liveFixture = {
    id: FIXTURE_ID,
    opponent: "World Girls",
    status: "live",
    shaita_goals: 1,
    opponent_goals: 0,
    kickoff_time: "15:00:00",
    venue: null,
    is_published: true,
    alerts_muted: false,
    last_alert_score: null,
    live_alert_sent_at: null,
    halftime_alert_sent_at: null,
    fulltime_alert_sent_at: null,
  };

  function queue(due: unknown[], reminders: unknown[] = []) {
    fake.onRpc((call) => {
      if (call.name === "push_claim_kickoff_reminders") return { data: reminders, error: null };
      if (call.name === "push_claim_due") return { data: due, error: null };
      return { data: null, error: null };
    });
  }

  const subscribers = () =>
    fake.respond({ table: "push_subscriptions", op: "select" }, {
      data: [{ id: "s1", endpoint: FCM, p256dh: "B".repeat(87), auth: "a".repeat(22), failure_count: 0 }],
      error: null,
    });

  it("sends a goal built from the fixture as it is now, records it and marks the row sent", async () => {
    queue([{ id: "o1", kind: "score", fixture_id: FIXTURE_ID, article_id: null }]);
    fake.respond({ table: "fixtures", op: "select" }, { data: liveFixture, error: null });
    subscribers();

    const summary = await runDispatch(fake.client as unknown as SupabaseClient);

    expect(summary).toEqual({ reminders: 0, processed: 1, sent: 1, skipped: 0 });
    expect(JSON.parse(push.sendNotification.mock.calls[0][1]).title).toBe("GOAL!");
    expect(fake.rpcCalls).toContainEqual({ name: "push_record_alert", args: { p_fixture_id: FIXTURE_ID, p_kind: "score", p_score: "1-0" } });
    expect(fake.rpcCalls.at(-1)).toEqual({ name: "push_mark_sent", args: { p_ids: ["o1"] } });
  });

  it("skips (but still marks sent) an alert whose score was corrected back", async () => {
    queue([{ id: "o1", kind: "score", fixture_id: FIXTURE_ID, article_id: null }]);
    fake.respond({ table: "fixtures", op: "select" }, { data: { ...liveFixture, last_alert_score: "1-0" }, error: null });

    const summary = await runDispatch(fake.client as unknown as SupabaseClient);

    expect(summary).toMatchObject({ processed: 1, sent: 0, skipped: 1 });
    expect(push.sendNotification).not.toHaveBeenCalled();
    expect(fake.rpcCalls.map((call) => call.name)).not.toContain("push_record_alert");
    expect(fake.rpcCalls.at(-1)).toEqual({ name: "push_mark_sent", args: { p_ids: ["o1"] } });
  });

  it("sends nothing for a fixture muted after the alert was queued", async () => {
    queue([{ id: "o1", kind: "fulltime", fixture_id: FIXTURE_ID, article_id: null }]);
    fake.respond({ table: "fixtures", op: "select" }, { data: { ...liveFixture, status: "played", alerts_muted: true }, error: null });

    expect(await runDispatch(fake.client as unknown as SupabaseClient)).toMatchObject({ sent: 0, skipped: 1 });
    expect(push.sendNotification).not.toHaveBeenCalled();
  });

  it("sends claimed kick-off reminders to the kickoff topic", async () => {
    queue([], [{ fixture_id: FIXTURE_ID }]);
    fake.respond({ table: "fixtures", op: "select" }, { data: { ...liveFixture, status: "scheduled" }, error: null });
    subscribers();

    expect(await runDispatch(fake.client as unknown as SupabaseClient)).toMatchObject({ reminders: 1, sent: 1 });
    const read = fake.calls.find((call) => call.table === "push_subscriptions");
    expect(read?.filters).toContainEqual({ column: "topics", operator: "contains", value: ["kickoff"] });
    expect(fake.rpcCalls.map((call) => call.name)).not.toContain("push_mark_sent");
  });

  it("sends news for a published article", async () => {
    queue([{ id: "o2", kind: "news", fixture_id: null, article_id: "a1" }]);
    fake.respond({ table: "articles", op: "select" }, { data: { id: "a1", slug: "cup-final", title: "Angels win the cup", is_published: true }, error: null });
    subscribers();

    expect(await runDispatch(fake.client as unknown as SupabaseClient)).toMatchObject({ processed: 1, sent: 1 });
    expect(JSON.parse(push.sendNotification.mock.calls[0][1])).toMatchObject({ url: "/news/cup-final" });
  });
});
