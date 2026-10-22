import { describe, expect, it } from "vitest";
import { describeEndpoint, isAllowedPushEndpoint, parseSubscribeBody } from "@/lib/push/endpoint";

const P256DH = "B".repeat(87);
const AUTH = "a".repeat(22);
const FCM = "https://fcm.googleapis.com/fcm/send/abc123:def456";

function body(overrides: Record<string, unknown> = {}) {
  return { subscription: { endpoint: FCM, keys: { p256dh: P256DH, auth: AUTH } }, topics: ["kickoff", "goals"], ...overrides };
}

describe("isAllowedPushEndpoint", () => {
  it.each([
    FCM,
    "https://updates.push.services.mozilla.com/wpush/v2/gAAAA",
    "https://web.push.apple.com/QGuQyavXutnMAbc",
    "https://api.push.apple.com/3/device/abc",
    "https://wns2-par02p.notify.windows.com/w/?token=BQYAAA",
  ])("accepts a real push service: %s", (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(true);
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://evil.example.com/fcm/send/abc",
    "https://fcm.googleapis.com.evil.example/abc",
    "https://googleapis.com/abc",
    "https://user:pass@fcm.googleapis.com/abc",
    "https://fcm.googleapis.com:8443/abc",
    "https://169.254.169.254/latest/meta-data",
    "not a url",
    `https://fcm.googleapis.com/${"x".repeat(1000)}`,
  ])("rejects anything else: %s", (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(false);
  });
});

describe("parseSubscribeBody", () => {
  it("returns the clean subscription and de-duplicated topics", () => {
    expect(parseSubscribeBody(body({ topics: ["goals", "goals", "news"] }))).toEqual({
      endpoint: FCM,
      p256dh: P256DH,
      auth: AUTH,
      topics: ["goals", "news"],
    });
  });

  it.each([
    ["no body", null],
    ["no subscription", { topics: ["goals"] }],
    ["a foreign endpoint", body({ subscription: { endpoint: "https://example.com/x", keys: { p256dh: P256DH, auth: AUTH } } })],
    ["missing keys", body({ subscription: { endpoint: FCM } })],
    ["a short p256dh", body({ subscription: { endpoint: FCM, keys: { p256dh: "abc", auth: AUTH } } })],
    ["a non-base64 auth", body({ subscription: { endpoint: FCM, keys: { p256dh: P256DH, auth: "<script>alert(1)</script>" } } })],
    ["no topics", body({ topics: [] })],
    ["an unknown topic", body({ topics: ["goals", "everything"] })],
    ["topics that are not a list", body({ topics: "goals" })],
  ])("rejects %s", (_label, input) => {
    expect(parseSubscribeBody(input)).toHaveProperty("error");
  });
});

describe("describeEndpoint", () => {
  it("never returns the full capability URL", () => {
    const described = describeEndpoint(FCM);
    expect(described).toContain("fcm.googleapis.com");
    expect(described).not.toContain("abc123");
  });
});
