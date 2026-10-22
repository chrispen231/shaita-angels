import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createFakeSupabase, type FakeSupabase } from "./helpers/fake-supabase";

const push = vi.hoisted(() => ({ sendNotification: vi.fn() }));
vi.mock("web-push", () => ({ default: push }));

import { sendToTopic } from "@/lib/push/send";
import type { PushMessage } from "@/lib/push/messages";

const MESSAGE: PushMessage = {
  topic: "goals",
  title: "GOAL!",
  body: "Shaita Angels 1–0 World Girls",
  url: "/match/m1",
  tag: "match-m1",
  ttl: 600,
  urgency: "high",
};

function subscriber(id: string, failure_count = 0) {
  return { id, endpoint: `https://fcm.googleapis.com/fcm/send/${id}`, p256dh: "p".repeat(87), auth: "a".repeat(22), failure_count };
}

let fake: FakeSupabase;

beforeEach(() => {
  fake = createFakeSupabase();
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
  vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
  vi.stubEnv("VAPID_SUBJECT", "mailto:club@example.org");
  push.sendNotification.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const send = () => sendToTopic(fake.client as unknown as SupabaseClient, "goals", MESSAGE);

describe("sendToTopic", () => {
  it("reads only the topic's subscribers and sends the payload with TTL and urgency", async () => {
    fake.respond({ table: "push_subscriptions", op: "select" }, { data: [subscriber("s1")], error: null });
    push.sendNotification.mockResolvedValue({ statusCode: 201 });

    expect(await send()).toEqual({ sent: 1, removed: 0, failed: 0 });

    const read = fake.calls.find((call) => call.table === "push_subscriptions" && call.op === "select");
    expect(read?.filters).toContainEqual({ column: "topics", operator: "contains", value: ["goals"] });
    const [target, payload, options] = push.sendNotification.mock.calls[0];
    expect(target).toEqual({ endpoint: "https://fcm.googleapis.com/fcm/send/s1", keys: { p256dh: "p".repeat(87), auth: "a".repeat(22) } });
    expect(JSON.parse(payload)).toEqual({ title: "GOAL!", body: "Shaita Angels 1–0 World Girls", url: "/match/m1", tag: "match-m1" });
    expect(options).toMatchObject({ TTL: 600, urgency: "high", vapidDetails: { subject: "mailto:club@example.org" } });
  });

  it("includes the vibration pattern in the payload only when the message has one", async () => {
    fake.respond({ table: "push_subscriptions", op: "select" }, { data: [subscriber("s1")], error: null });
    push.sendNotification.mockResolvedValue({ statusCode: 201 });

    await sendToTopic(fake.client as unknown as SupabaseClient, "goals", { ...MESSAGE, vibrate: [300, 100, 600] });

    const [, payload] = push.sendNotification.mock.calls[0];
    expect(JSON.parse(payload).vibrate).toEqual([300, 100, 600]);
  });

  it("deletes subscriptions the push service says are gone (404/410)", async () => {
    fake.respond({ table: "push_subscriptions", op: "select" }, { data: [subscriber("gone"), subscriber("expired")], error: null });
    push.sendNotification
      .mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }))
      .mockRejectedValueOnce(Object.assign(new Error("not found"), { statusCode: 404 }));

    expect(await send()).toEqual({ sent: 0, removed: 2, failed: 0 });
    expect(fake.writes("push_subscriptions", "delete").map((call) => call.filters[0].value)).toEqual(["gone", "expired"]);
  });

  it("counts other failures and removes a subscription after five in a row", async () => {
    fake.respond({ table: "push_subscriptions", op: "select" }, { data: [subscriber("flaky", 1), subscriber("dying", 4)], error: null });
    push.sendNotification.mockRejectedValue(Object.assign(new Error("server error"), { statusCode: 500 }));

    expect(await send()).toEqual({ sent: 0, removed: 1, failed: 1 });
    expect(fake.writes("push_subscriptions", "update")[0]).toMatchObject({ values: { failure_count: 2 } });
    expect(fake.writes("push_subscriptions", "delete")[0].filters[0].value).toBe("dying");
  });

  it("resets the failure count after a success", async () => {
    fake.respond({ table: "push_subscriptions", op: "select" }, { data: [subscriber("recovered", 3)], error: null });
    push.sendNotification.mockResolvedValue({ statusCode: 201 });

    await send();
    expect(fake.writes("push_subscriptions", "update")[0]).toMatchObject({ values: { failure_count: 0 } });
  });

  it("sends nothing without VAPID keys", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    expect(await send()).toEqual({ sent: 0, removed: 0, failed: 0 });
    expect(fake.calls).toHaveLength(0);
    expect(push.sendNotification).not.toHaveBeenCalled();
  });
});
