import { describe, it, expect } from "vitest";
import {
  validateFixture,
  type FixtureInput,
} from "@/lib/fixtures/validation";

/**
 * These tests mirror the CHECK constraints in
 * supabase/migrations/20260928202929_fixtures_results.sql.
 *
 * The database is the real enforcement boundary; this suite exists so a change
 * to the admin form that drifts from the schema is caught before it ships. If
 * you edit the SQL, update validateFixture to match.
 */

const valid: FixtureInput = {
  opponent: "World Girls",
  competition: "Women’s Orange Cup · Final",
  season: "2025–26",
  match_date: "2026-07-14",
  kickoff_time: "15:00",
  venue: "SKD Sports Complex",
  venue_type: "neutral",
  status: "played",
  shaita_goals: 2,
  opponent_goals: 1,
  notes: "",
  opponent_logo_url: null,
  opponent_logo_alt: null,
};

describe("opponent / competition / season", () => {
  it("accepts the confirmed Orange Cup final", () => {
    expect(validateFixture(valid)).toBeNull();
  });

  it.each(["opponent", "competition", "season"])("rejects an empty %s", (field) => {
    expect(validateFixture({ ...valid, [field]: "" })).toMatch(/opponent, competition, and season/i);
  });

  it("rejects an opponent longer than 100 characters", () => {
    expect(validateFixture({ ...valid, opponent: "a".repeat(101) })).toMatch(/opponent, competition, and season/i);
  });

  it("rejects a competition longer than 120 characters", () => {
    expect(validateFixture({ ...valid, competition: "a".repeat(121) })).toMatch(/opponent, competition, and season/i);
  });

  it("rejects a season longer than 30 characters", () => {
    expect(validateFixture({ ...valid, season: "a".repeat(31) })).toMatch(/opponent, competition, and season/i);
  });
});

describe("match date", () => {
  it.each(["", "14/07/2026", "2026-7-14", "20260714", "not-a-date"])("rejects %o", (match_date) => {
    expect(validateFixture({ ...valid, match_date })).toMatch(/valid match date/i);
  });

  it("accepts a well-formed ISO date", () => {
    expect(validateFixture({ ...valid, match_date: "2026-09-30" })).toBeNull();
  });
});

describe("kickoff time", () => {
  it("allows an empty time", () => {
    expect(validateFixture({ ...valid, kickoff_time: "" })).toBeNull();
  });

  it.each(["24:00", "12:60", "9:00", "12:0", "1200", "12:00:00"])("rejects %o", (kickoff_time) => {
    expect(validateFixture({ ...valid, kickoff_time })).toMatch(/24-hour HH:MM/i);
  });

  it("accepts 00:00", () => {
    expect(validateFixture({ ...valid, kickoff_time: "00:00" })).toBeNull();
  });
});

describe("venue type", () => {
  it.each(["home", "away", "neutral"])("accepts %s", (venue_type) => {
    expect(validateFixture({ ...valid, venue_type })).toBeNull();
  });

  it.each(["", "HOME", "stadium"])("rejects %o", (venue_type) => {
    expect(validateFixture({ ...valid, venue_type })).toMatch(/valid venue type/i);
  });
});

describe("status", () => {
  it.each(["scheduled", "played", "postponed", "cancelled"])("accepts %s", (status) => {
    const input =
      status === "played"
        ? valid
        : { ...valid, status, shaita_goals: null, opponent_goals: null };
    expect(validateFixture(input)).toBeNull();
  });

  it.each(["", "played-extra", "PLANNED"])("rejects %o", (status) => {
    const input =
      status === ""
        ? { ...valid, status, shaita_goals: null, opponent_goals: null }
        : { ...valid, status };
    expect(validateFixture(input)).toMatch(/valid match status/i);
  });
});

describe("scores mirror the fixtures_scores_match_status constraint", () => {
  it("requires both scores when played", () => {
    expect(validateFixture({ ...valid, opponent_goals: null })).toMatch(/both scores/i);
    expect(validateFixture({ ...valid, shaita_goals: null })).toMatch(/both scores/i);
  });

  it("forbids scores on any non-played status", () => {
    for (const status of ["scheduled", "postponed", "cancelled"] as const) {
      expect(validateFixture({ ...valid, status })).toMatch(/both scores/i);
    }
  });

  it("allows a goalless draw", () => {
    expect(validateFixture({ ...valid, shaita_goals: 0, opponent_goals: 0 })).toBeNull();
  });

  it("rejects a negative score", () => {
    expect(validateFixture({ ...valid, shaita_goals: -1 })).toMatch(/both scores/i);
  });

  it("rejects a score above 99", () => {
    expect(validateFixture({ ...valid, shaita_goals: 100 })).toMatch(/both scores/i);
  });
});

describe("free text limits", () => {
  it("allows empty venue and notes", () => {
    expect(validateFixture({ ...valid, venue: "", notes: "" })).toBeNull();
  });

  it("rejects a venue longer than 160 characters", () => {
    expect(validateFixture({ ...valid, venue: "a".repeat(161) })).toMatch(/venue or notes/i);
  });

  it("rejects notes longer than 2000 characters", () => {
    expect(validateFixture({ ...valid, notes: "a".repeat(2001) })).toMatch(/venue or notes/i);
  });
});

describe("opponent logo", () => {
  const withLogo = (url: string | null, alt: string | null = null) => ({
    ...valid,
    opponent_logo_url: url,
    opponent_logo_alt: alt,
  });

  it("accepts no logo", () => {
    expect(validateFixture(withLogo(null))).toBeNull();
  });

  it("accepts an absolute https url", () => {
    expect(
      validateFixture(withLogo("https://abc.supabase.co/storage/v1/object/public/opponents/a.png")),
    ).toBeNull();
  });

  it("accepts an absolute http url", () => {
    expect(validateFixture(withLogo("http://example.com/a.png"))).toBeNull();
  });

  it("rejects a relative path", () => {
    // It is rendered into an image src, so a bare path would resolve against the
    // admin origin and 404 rather than show the crest.
    expect(validateFixture(withLogo("/opponents/a.png"))).toMatch(/full http/);
  });

  it("rejects a script url", () => {
    expect(validateFixture(withLogo("javascript:alert(1)"))).toMatch(/full http/);
    expect(validateFixture(withLogo("data:image/png;base64,AAA"))).toMatch(/full http/);
  });

  it("rejects a url with whitespace", () => {
    expect(validateFixture(withLogo("https://example.com/a b.png"))).toMatch(/full http/);
  });

  it("caps the description at 200 characters", () => {
    expect(validateFixture(withLogo("https://example.com/a.png", "a".repeat(200)))).toBeNull();
    expect(validateFixture(withLogo("https://example.com/a.png", "a".repeat(201)))).toMatch(
      /under 200/,
    );
  });

  it("rejects an over-long url", () => {
    expect(validateFixture(withLogo(`https://example.com/${"a".repeat(600)}`))).toMatch(/too long/);
  });
});
