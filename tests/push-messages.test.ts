import { describe, expect, it } from "vitest";
import {
  buildMatchMessage,
  buildNewsMessage,
  GOAL_VIBRATION,
  KICKOFF_VIBRATION,
  scoreKey,
  type AlertFixture,
} from "@/lib/push/messages";

const ID = "11111111-1111-4111-8111-111111111111";

function fixture(overrides: Partial<AlertFixture> = {}): AlertFixture {
  return {
    id: ID,
    opponent: "World Girls",
    status: "live",
    shaita_goals: 0,
    opponent_goals: 0,
    kickoff_time: "15:00:00",
    venue: "Careysburg",
    is_published: true,
    alerts_muted: false,
    last_alert_score: null,
    live_alert_sent_at: null,
    halftime_alert_sent_at: null,
    fulltime_alert_sent_at: null,
    ...overrides,
  };
}

describe("buildMatchMessage: never for hidden or muted fixtures", () => {
  it.each(["kickoff_reminder", "live_start", "score", "halftime", "fulltime"] as const)("%s", (kind) => {
    const status = kind === "kickoff_reminder" ? "scheduled" : kind === "halftime" ? "halftime" : kind === "fulltime" ? "played" : "live";
    const base = fixture({ status, shaita_goals: 1 });
    expect(buildMatchMessage(kind, base)).not.toBeNull();
    expect(buildMatchMessage(kind, { ...base, alerts_muted: true })).toBeNull();
    expect(buildMatchMessage(kind, { ...base, is_published: false })).toBeNull();
  });
});

describe("kick-off", () => {
  it("reminds with the time and venue, on the kickoff topic", () => {
    expect(buildMatchMessage("kickoff_reminder", fixture({ status: "scheduled" }))).toMatchObject({
      topic: "kickoff",
      title: "Kick-off soon",
      body: "Shaita Angels vs World Girls kicks off at 15:00, Careysburg.",
      url: `/match/${ID}`,
      tag: `match-${ID}`,
    });
  });

  it("skips a reminder once the match is no longer scheduled", () => {
    expect(buildMatchMessage("kickoff_reminder", fixture({ status: "postponed" }))).toBeNull();
  });

  it("announces the start once", () => {
    expect(buildMatchMessage("live_start", fixture())).toMatchObject({ topic: "kickoff", title: "Kick-off!", urgency: "high" });
    expect(buildMatchMessage("live_start", fixture({ live_alert_sent_at: "2026-10-24T15:00:00Z" }))).toBeNull();
    expect(buildMatchMessage("live_start", fixture({ status: "scheduled" }))).toBeNull();
  });
});

describe("goals", () => {
  it("calls a Shaita goal a GOAL, scoreline from Shaita's side", () => {
    expect(buildMatchMessage("score", fixture({ shaita_goals: 1 }))).toMatchObject({
      topic: "goals",
      title: "GOAL!",
      body: "Shaita Angels 1–0 World Girls",
      ttl: 600,
    });
  });

  it("names the opponent when they score", () => {
    expect(buildMatchMessage("score", fixture({ shaita_goals: 1, opponent_goals: 1, last_alert_score: "1-0" }))).toMatchObject({
      title: "World Girls score",
      body: "Shaita Angels 1–1 World Girls",
    });
  });

  it("falls back to a neutral update when the change is not a single goal", () => {
    expect(buildMatchMessage("score", fixture({ shaita_goals: 0, opponent_goals: 0, last_alert_score: "1-0" }))?.title).toBe("Score update");
    expect(buildMatchMessage("score", fixture({ shaita_goals: 2, opponent_goals: 1, last_alert_score: "1-0" }))?.title).toBe("Score update");
  });

  it("sends nothing when a typo was corrected before the alert went out", () => {
    expect(buildMatchMessage("score", fixture({ shaita_goals: 1, opponent_goals: 0, last_alert_score: "1-0" }))).toBeNull();
    expect(buildMatchMessage("score", fixture({ shaita_goals: 0, opponent_goals: 0 }))).toBeNull();
  });

  it("sends nothing once the match is over (full time covers it)", () => {
    expect(buildMatchMessage("score", fixture({ status: "played", shaita_goals: 2 }))).toBeNull();
  });
});

describe("half time and full time", () => {
  it("half time goes to goals subscribers, once", () => {
    expect(buildMatchMessage("halftime", fixture({ status: "halftime", shaita_goals: 1 }))).toMatchObject({
      topic: "goals",
      title: "Half time",
      body: "Shaita Angels 1–0 World Girls",
    });
    expect(buildMatchMessage("halftime", fixture({ status: "halftime", halftime_alert_sent_at: "2026-10-24T15:47:00Z" }))).toBeNull();
    expect(buildMatchMessage("halftime", fixture({ status: "live" }))).toBeNull();
  });

  it("full time goes to results subscribers, once", () => {
    expect(buildMatchMessage("fulltime", fixture({ status: "played", shaita_goals: 2, opponent_goals: 1 }))).toMatchObject({
      topic: "results",
      title: "Full time",
      body: "Shaita Angels 2–1 World Girls",
    });
    expect(buildMatchMessage("fulltime", fixture({ status: "played", fulltime_alert_sent_at: "2026-10-24T16:50:00Z" }))).toBeNull();
    expect(buildMatchMessage("fulltime", fixture({ status: "cancelled" }))).toBeNull();
  });
});

describe("news and helpers", () => {
  it("links to the story", () => {
    expect(buildNewsMessage({ id: "a1", slug: "cup-final", title: "Angels win the cup", is_published: true })).toMatchObject({
      topic: "news",
      body: "Angels win the cup",
      url: "/news/cup-final",
      tag: "news-a1",
    });
    expect(buildNewsMessage({ id: "a1", slug: "x", title: "Draft", is_published: false })).toBeNull();
  });

  it("scoreKey is null until both scores exist", () => {
    expect(scoreKey({ shaita_goals: 2, opponent_goals: 1 })).toBe("2-1");
    expect(scoreKey({ shaita_goals: null, opponent_goals: 1 })).toBeNull();
  });
});

describe("vibration", () => {
  it("gives goals a long pattern and kick-off a short double buzz", () => {
    expect(buildMatchMessage("score", fixture({ shaita_goals: 1 }))?.vibrate).toEqual(GOAL_VIBRATION);
    expect(buildMatchMessage("kickoff_reminder", fixture({ status: "scheduled" }))?.vibrate).toEqual(KICKOFF_VIBRATION);
    expect(buildMatchMessage("live_start", fixture({ status: "live" }))?.vibrate).toEqual(KICKOFF_VIBRATION);
  });

  it("leaves half time, full time and news on the phone's default", () => {
    expect(buildMatchMessage("halftime", fixture({ status: "halftime" }))?.vibrate).toBeUndefined();
    expect(buildMatchMessage("fulltime", fixture({ status: "played", shaita_goals: 2, opponent_goals: 1 }))?.vibrate).toBeUndefined();
    expect(buildNewsMessage({ id: "a1", slug: "story", title: "Story", is_published: true })?.vibrate).toBeUndefined();
  });
});
