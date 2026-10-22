/**
 * Push subscription input checks.
 *
 * The dispatcher POSTs to every stored endpoint, so an endpoint is only accepted
 * when it belongs to a real browser push service. Without the allow-list, anyone
 * could make the server send requests to an address of their choosing.
 */

export const PUSH_TOPICS = ["kickoff", "goals", "results", "news"] as const;
export type PushTopic = (typeof PUSH_TOPICS)[number];

/** What the subscribe form starts with: match alerts on, news off. */
export const DEFAULT_TOPICS: readonly PushTopic[] = ["kickoff", "goals", "results"];

const EXACT_HOSTS = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
]);

const HOST_SUFFIXES = [".googleapis.com", ".push.services.mozilla.com", ".push.apple.com", ".notify.windows.com"];

export function isAllowedPushEndpoint(value: string): boolean {
  if (typeof value !== "string" || value.length > 1000) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return EXACT_HOSTS.has(host) || HOST_SUFFIXES.some((suffix) => host.endsWith(suffix) && host.length > suffix.length);
}

export function isPushTopic(value: unknown): value is PushTopic {
  return typeof value === "string" && (PUSH_TOPICS as readonly string[]).includes(value);
}

// Base64url, as browsers encode subscription keys. p256dh is a 65-byte P-256
// point (87 characters unpadded); auth is a 16-byte secret (22 characters).
const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

export type SubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  topics: PushTopic[];
};

/** Validates a subscribe request body. Returns the clean input or an error message. */
export function parseSubscribeBody(body: unknown): SubscriptionInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid request." };
  const { subscription, topics } = body as { subscription?: unknown; topics?: unknown };
  if (!subscription || typeof subscription !== "object") return { error: "Missing subscription." };
  const { endpoint, keys } = subscription as { endpoint?: unknown; keys?: unknown };
  if (typeof endpoint !== "string" || !isAllowedPushEndpoint(endpoint)) return { error: "Unsupported push service." };
  if (!keys || typeof keys !== "object") return { error: "Missing subscription keys." };
  const { p256dh, auth } = keys as { p256dh?: unknown; auth?: unknown };
  if (typeof p256dh !== "string" || !BASE64URL.test(p256dh) || p256dh.length < 80 || p256dh.length > 100) {
    return { error: "Invalid subscription key." };
  }
  if (typeof auth !== "string" || !BASE64URL.test(auth) || auth.length < 16 || auth.length > 32) {
    return { error: "Invalid subscription key." };
  }
  if (!Array.isArray(topics) || topics.length === 0 || topics.length > PUSH_TOPICS.length) {
    return { error: "Choose at least one kind of alert." };
  }
  if (!topics.every(isPushTopic)) return { error: "Unknown alert type." };
  return { endpoint, p256dh, auth, topics: [...new Set(topics)] };
}

/** For logs: the push service host and a short tail, never the full capability URL. */
export function describeEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    return `${url.hostname}/…${url.pathname.slice(-6)}`;
  } catch {
    return "invalid-endpoint";
  }
}
