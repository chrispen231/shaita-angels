import { describe, it, expect } from "vitest";
import {
  COMPETITIONS,
  competitionBadge,
  isCompetitionSlug,
  matchCompetition,
  monthKey,
  monthLabel,
  daysUntil,
  roundLabel,
  hasScore,
  opponentInitials,
  formatMatchDateLong,
} from "@/lib/fixtures";
import { parseMatchFilters } from "@/components/SectionPage";
import type { Fixture } from "@/types/fixtures";

function make(overrides: Partial<Fixture> & { id: string }): Fixture {
  return {
    opponent: "Opponent",
    competition: "Cup",
    season: "2026",
    match_date: "2026-07-14",
    kickoff_time: null,
    venue: null,
    venue_type: "home",
    status: "scheduled",
    shaita_goals: null,
    opponent_goals: null,
    notes: null,
    is_published: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("matchCompetition", () => {
  it("maps each known competition to its slug", () => {
    expect(matchCompetition("LFA Women's First Division")).toBe("lfa-womens-first-division");
    expect(matchCompetition("Women’s Orange Cup")).toBe("womens-orange-cup");
    expect(matchCompetition("Club Friendlies")).toBe("club-friendlies");
  });

  it("matches a competition that carries a stage suffix", () => {
    // The live row reads "Women's Orange Cup · Final".
    expect(matchCompetition("Women’s Orange Cup · Final")).toBe("womens-orange-cup");
    expect(matchCompetition("LFA Women's First Division · Matchday 4")).toBe("lfa-womens-first-division");
  });

  it("handles straight and curly apostrophes", () => {
    expect(matchCompetition("LFA Women's First Division")).toBe("lfa-womens-first-division");
    expect(matchCompetition("LFA Women’s First Division")).toBe("lfa-womens-first-division");
  });

  it("is case insensitive", () => {
    expect(matchCompetition("club friendlies")).toBe("club-friendlies");
  });

  it("returns null for an unknown competition rather than hiding the fixture", () => {
    expect(matchCompetition("LFA Women’s Super Cup")).toBeNull();
    expect(matchCompetition("")).toBeNull();
  });

  it("covers all three club competitions", () => {
    for (const entry of COMPETITIONS) {
      expect(matchCompetition(entry.label)).toBe(entry.slug);
    }
  });
});

describe("isCompetitionSlug", () => {
  it("accepts the three known slugs", () => {
    for (const entry of COMPETITIONS) {
      expect(isCompetitionSlug(entry.slug)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isCompetitionSlug("")).toBe(false);
    expect(isCompetitionSlug("nonsense")).toBe(false);
    expect(isCompetitionSlug("LFA Women's First Division")).toBe(false);
  });
});

describe("parseMatchFilters", () => {
  it("accepts a well-formed period and competition", () => {
    expect(parseMatchFilters({ period: "2026-10", competition: "womens-orange-cup" })).toEqual({
      period: "2026-10",
      competition: "womens-orange-cup",
    });
  });

  it("drops an unknown competition instead of erroring", () => {
    expect(parseMatchFilters({ competition: "not-a-competition" }).competition).toBeNull();
  });

  it("drops a malformed period", () => {
    expect(parseMatchFilters({ period: "October" }).period).toBeNull();
    expect(parseMatchFilters({ period: "2026-13-01" }).period).toBeNull();
  });

  it("handles missing params", () => {
    expect(parseMatchFilters({})).toEqual({ period: null, competition: null });
  });
});

describe("monthKey / monthLabel", () => {
  it("extracts the month from a date", () => {
    expect(monthKey("2026-07-14")).toBe("2026-07");
    expect(monthKey("2025-12-31")).toBe("2025-12");
  });

  it("labels the month and year", () => {
    expect(monthLabel("2026-07")).toBe("July 2026");
    expect(monthLabel("2025-12")).toBe("December 2025");
  });

  it("returns the key unchanged for an unparseable value", () => {
    expect(monthLabel("nope")).toBe("nope");
  });
});

describe("competitionBadge", () => {
  it("drops the stage suffix", () => {
    expect(competitionBadge("Women’s Orange Cup · Final")).toBe("WOMEN’S ORANGE CUP");
    expect(competitionBadge("LFA Women's First Division")).toBe("LFA WOMEN'S FIRST DIVISION");
  });
});

describe("roundLabel", () => {
  it("reads a matchweek out of the notes field", () => {
    expect(roundLabel(make({ id: "a", notes: "Matchweek 7" }))).toBe("Matchweek 7");
    expect(roundLabel(make({ id: "b", notes: "Round: 4" }))).toBe("Matchweek 4");
  });

  it("returns null when no round was recorded", () => {
    expect(roundLabel(make({ id: "c", notes: "Bring a bottle" }))).toBeNull();
    expect(roundLabel(make({ id: "d", notes: null }))).toBeNull();
  });
});

describe("hasScore", () => {
  it("is true only for a played match with both scores", () => {
    expect(hasScore(make({ id: "a", status: "played", shaita_goals: 2, opponent_goals: 1 }))).toBe(true);
    expect(hasScore(make({ id: "b", status: "played", shaita_goals: 2, opponent_goals: null }))).toBe(false);
    expect(hasScore(make({ id: "c", status: "scheduled" }))).toBe(false);
  });
});

describe("opponentInitials", () => {
  it("takes up to two initials", () => {
    expect(opponentInitials("World Girls")).toBe("WG");
    expect(opponentInitials("SK Slovan Bratislava")).toBe("SS");
    expect(opponentInitials("  ")).toBe("FC");
  });
});

describe("formatMatchDateLong", () => {
  it("produces an uppercase weekday block", () => {
    expect(formatMatchDateLong("2026-07-14")).toContain("JULY");
    expect(formatMatchDateLong("2026-07-14")).toContain("2026");
    expect(formatMatchDateLong("2026-07-14")).toBe(formatMatchDateLong("2026-07-14").toUpperCase());
  });
});

describe("daysUntil", () => {
  it("is null for a past or today date", () => {
    expect(daysUntil("2000-01-01")).toBeNull();
  });

  it("is positive for a future date", () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 10);
    const iso = future.toISOString().slice(0, 10);
    expect(daysUntil(iso)).toBe(10);
  });

  it("is null for a malformed date", () => {
    expect(daysUntil("not-a-date")).toBeNull();
  });
});