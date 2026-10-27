/**
 * Match alert copy.
 *
 * Every builder reads the fixture as it is when the alert is SENT, not as it was
 * when the admin saved. That is what makes the correction window work: a goal
 * typed by mistake and fixed within the minute leaves the score where the last
 * alert left it, so the builder returns null and nothing goes out.
 *
 * Scores always read from Shaita's side first ("Shaita Angels 2–1 Opponent"),
 * whichever team is at home, because every subscriber is an Angels fan.
 */
import type { PushTopic } from "@/lib/push/endpoint";

export type MatchAlertKind = "kickoff_reminder" | "live_start" | "score" | "halftime" | "fulltime";
export type OutboxKind = Exclude<MatchAlertKind, "kickoff_reminder"> | "news";

export type PushMessage = {
  topic: PushTopic;
  title: string;
  body: string;
  url: string;
  tag: string;
  /** Seconds the push service keeps an undelivered alert. A stale goal is noise. */
  ttl: number;
  urgency: "very-low" | "low" | "normal" | "high";
  /** Android vibration pattern in ms (buzz, pause, buzz…). Omitted means the phone's default. */
  vibrate?: number[];
};

/*
 * Goals get a distinct long pattern so a fan can tell one from a reminder without
 * looking; kick-off gets a short double buzz. Android may ignore these when the
 * site's notification channel has vibration turned off.
 */
export const GOAL_VIBRATION = [300, 100, 300, 100, 600];
export const KICKOFF_VIBRATION = [200, 100, 200];

export type AlertFixture = {
  id: string;
  opponent: string;
  status: string;
  shaita_goals: number | null;
  opponent_goals: number | null;
  kickoff_time: string | null;
  venue: string | null;
  is_published: boolean;
  alerts_muted: boolean;
  last_alert_score: string | null;
  live_alert_sent_at: string | null;
  halftime_alert_sent_at: string | null;
  fulltime_alert_sent_at: string | null;
};

export type AlertArticle = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
};

export const ALERT_FIXTURE_COLUMNS =
  "id, opponent, status, shaita_goals, opponent_goals, kickoff_time, venue, is_published, alerts_muted, last_alert_score, live_alert_sent_at, halftime_alert_sent_at, fulltime_alert_sent_at" as const;

const CLUB = "Shaita Angels";

export function scoreKey(fixture: Pick<AlertFixture, "shaita_goals" | "opponent_goals">): string | null {
  if (fixture.shaita_goals === null || fixture.opponent_goals === null) return null;
  return `${fixture.shaita_goals}-${fixture.opponent_goals}`;
}

function scoreline(fixture: AlertFixture): string {
  const key = scoreKey(fixture);
  if (!key) return `${CLUB} vs ${fixture.opponent}`;
  return `${CLUB} ${fixture.shaita_goals}–${fixture.opponent_goals} ${fixture.opponent}`;
}

function parseScore(key: string | null): [number, number] {
  const match = key?.match(/^(\d{1,2})-(\d{1,2})$/);
  return match ? [Number(match[1]), Number(match[2])] : [0, 0];
}

function matchMessage(fixture: AlertFixture, fields: Omit<PushMessage, "url" | "tag">): PushMessage {
  return { ...fields, url: `/match/${fixture.id}`, tag: `match-${fixture.id}` };
}

/**
 * The alert for one fixture event, or null when it should not be sent: the
 * fixture is unpublished or muted, the match has moved on, the alert already
 * went out, or a score change was corrected back before sending.
 */
export function buildMatchMessage(kind: MatchAlertKind, fixture: AlertFixture): PushMessage | null {
  if (!fixture.is_published || fixture.alerts_muted) return null;

  switch (kind) {
    case "kickoff_reminder": {
      if (fixture.status !== "scheduled") return null;
      const time = fixture.kickoff_time ? ` at ${fixture.kickoff_time.slice(0, 5)}` : " soon";
      const where = fixture.venue ? `, ${fixture.venue}` : "";
      return matchMessage(fixture, {
        topic: "kickoff",
        title: "Kick-off soon",
        body: `${CLUB} vs ${fixture.opponent} kicks off${time}${where}.`,
        ttl: 3600,
        urgency: "normal",
        vibrate: KICKOFF_VIBRATION,
      });
    }
    case "live_start": {
      if (fixture.status !== "live" && fixture.status !== "halftime") return null;
      if (fixture.live_alert_sent_at) return null;
      return matchMessage(fixture, {
        topic: "kickoff",
        title: "Kick-off!",
        body: `${CLUB} vs ${fixture.opponent} is underway.`,
        ttl: 600,
        urgency: "high",
        vibrate: KICKOFF_VIBRATION,
      });
    }
    case "score": {
      if (fixture.status !== "live" && fixture.status !== "halftime") return null;
      const key = scoreKey(fixture);
      if (!key || key === (fixture.last_alert_score ?? "0-0")) return null;
      const [previousFor, previousAgainst] = parseScore(fixture.last_alert_score);
      const shaitaScored = fixture.shaita_goals! > previousFor && fixture.opponent_goals === previousAgainst;
      const opponentScored = fixture.opponent_goals! > previousAgainst && fixture.shaita_goals === previousFor;
      const title = shaitaScored ? "GOAL!" : opponentScored ? `${fixture.opponent} score` : "Score update";
      return matchMessage(fixture, {
        topic: "goals",
        title,
        body: scoreline(fixture),
        ttl: 600,
        urgency: "high",
        vibrate: GOAL_VIBRATION,
      });
    }
    case "halftime": {
      if (fixture.status !== "halftime" || fixture.halftime_alert_sent_at) return null;
      return matchMessage(fixture, {
        topic: "goals",
        title: "Half time",
        body: scoreline(fixture),
        ttl: 600,
        urgency: "high",
      });
    }
    case "fulltime": {
      if (fixture.status !== "played" || fixture.fulltime_alert_sent_at) return null;
      return matchMessage(fixture, {
        topic: "results",
        title: "Full time",
        body: scoreline(fixture),
        ttl: 3600,
        urgency: "high",
      });
    }
  }
}

export function buildNewsMessage(article: AlertArticle): PushMessage | null {
  if (!article.is_published) return null;
  return {
    topic: "news",
    title: "New from Shaita Angels",
    body: article.title,
    url: `/news/${article.slug}`,
    tag: `news-${article.id}`,
    ttl: 86400,
    urgency: "low",
  };
}
