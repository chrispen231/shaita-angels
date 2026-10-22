import { describe, it, expect } from "vitest";
import {
  competitionBadge,
  competitionKind,
  monthKey,
  monthLabel,
  daysUntil,
  roundLabel,
  hasScore,
  opponentInitials,
  formatMatchDateLong,
} from "@/lib/fixtures";
import { builtInCompetitions, competitionBySlug, matchCompetition } from "@/lib/reference-data";
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
    opponent_logo_url: null,
    opponent_logo_alt: null,
    went_live_at: null,
    formation: null,
    is_published: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

const competitions = builtInCompetitions();
const slugOf = (stored: string) => matchCompetition(competitions, stored)?.slug ?? null;

describe("matchCompetition (public filter)", () => {
  it("maps each known competition to its slug", () => {
    expect(slugOf("LFA Women's First Division")).toBe("lfa-womens-first-division");
    expect(slugOf("Women’s Orange Cup")).toBe("womens-orange-cup");
    expect(slugOf("Club Friendlies")).toBe("club-friendlies");
  });

  it("matches a competition that carries a stage suffix", () => {
    // The live row reads "Women's Orange Cup · Final".
    expect(slugOf("Women’s Orange Cup · Final")).toBe("womens-orange-cup");
    expect(slugOf("LFA Women's First Division · Matchday 4")).toBe("lfa-womens-first-division");
  });

  it("handles straight and curly apostrophes", () => {
    expect(slugOf("LFA Women's First Division")).toBe("lfa-womens-first-division");
    expect(slugOf("LFA Women’s First Division")).toBe("lfa-womens-first-division");
  });

  it("is case insensitive", () => {
    expect(slugOf("club friendlies")).toBe("club-friendlies");
  });

  it("finds a competition from a longer name containing its short name", () => {
    expect(slugOf("LFA Women’s Super Cup")).toBe("lfa-super-cup");
    expect(slugOf("Friendly")).toBe("club-friendlies");
    expect(slugOf("Pre-season friendly")).toBe("club-friendlies");
  });

  it("returns null for an unknown competition rather than hiding the fixture", () => {
    expect(slugOf("County Shield")).toBeNull();
    expect(slugOf("")).toBeNull();
  });

  it("covers all four club competitions", () => {
    for (const entry of competitions) {
      expect(slugOf(entry.name)).toBe(entry.slug);
    }
  });

  it("uses whatever list it is given, so a competition added in the admin gets a filter", () => {
    const withNew = [...competitions, { slug: "county-shield", name: "County Shield", short: "Shield" }];
    expect(matchCompetition(withNew, "County Shield · Semi-final")?.slug).toBe("county-shield");
  });
});

describe("competitionBySlug", () => {
  it("accepts the four known slugs", () => {
    for (const entry of competitions) {
      expect(competitionBySlug(competitions, entry.slug)).toBe(entry);
    }
  });

  it("rejects anything else", () => {
    expect(competitionBySlug(competitions, "")).toBeNull();
    expect(competitionBySlug(competitions, undefined)).toBeNull();
    expect(competitionBySlug(competitions, "nonsense")).toBeNull();
    expect(competitionBySlug(competitions, "LFA Women's First Division")).toBeNull();
  });
});

describe("competitionKind", () => {
  it("describes cups and leagues from the name, and nothing else", () => {
    expect(competitionKind("Women’s Orange Cup · Final")).toBe("cup");
    expect(competitionKind("LFA Super Cup")).toBe("cup");
    expect(competitionKind("LFA Women's First Division")).toBe("league");
    expect(competitionKind("Club Friendlies")).toBeNull();
  });
});

describe("parseMatchFilters", () => {
  it("accepts a well-formed season, period and competition", () => {
    expect(parseMatchFilters({ season: "2026/27", period: "2026-10", competition: "womens-orange-cup" })).toEqual({
      season: "2026/27",
      period: "2026-10",
      competition: "womens-orange-cup",
    });
  });

  it("drops an unknown competition instead of erroring", () => {
    expect(parseMatchFilters({ competition: "not-a-competition" }).competition).toBeNull();
  });

  it("validates the competition against the list it is given", () => {
    const fromDatabase = [{ slug: "county-shield", name: "County Shield", short: "Shield" }];
    expect(parseMatchFilters({ competition: "county-shield" }, fromDatabase).competition).toBe("county-shield");
    expect(parseMatchFilters({ competition: "womens-orange-cup" }, fromDatabase).competition).toBeNull();
  });

  it("drops a malformed period", () => {
    expect(parseMatchFilters({ period: "October" }).period).toBeNull();
    expect(parseMatchFilters({ period: "2026-13-01" }).period).toBeNull();
  });

  it("handles missing params", () => {
    expect(parseMatchFilters({})).toEqual({ season: null, period: null, competition: null });
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
    expect(hasScore(make({ id: "d", status: "halftime", shaita_goals: 1, opponent_goals: 0 }))).toBe(false);
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