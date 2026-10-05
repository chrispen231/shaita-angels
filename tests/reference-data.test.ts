import { describe, it, expect } from "vitest";
import {
  builtInCompetitions,
  matchCompetition,
  POSITIONS,
  POSITION_GROUPS,
  FEET,
  VENUE_TYPES,
  MATCH_STATUSES,
  ARTICLE_CATEGORIES,
} from "@/lib/reference-data";
import { COMPETITIONS } from "@/lib/fixtures";

/**
 * The dropdown values. These are the closed sets an admin picks from instead of
 * typing, so a wrong entry here shows up as a wrong option on every form.
 */

describe("competitions", () => {
  it("matches the fixture filter list exactly", () => {
    // src/lib/fixtures.ts drives /matches?competition=... and the badge text. If
    // these drift, a dropdown selection would produce a fixture whose competition
    // matches no filter.
    const fromReference = builtInCompetitions();
    expect(fromReference).toHaveLength(COMPETITIONS.length);
    fromReference.forEach((competition, index) => {
      expect(competition.slug).toBe(COMPETITIONS[index].slug);
      expect(competition.name).toBe(COMPETITIONS[index].label);
      expect(competition.short).toBe(COMPETITIONS[index].short);
    });
  });

  it("includes the three competitions the club plays in", () => {
    const names = builtInCompetitions().map((competition) => competition.name);
    expect(names).toContain("LFA Women\u2019s First Division");
    expect(names).toContain("Women\u2019s Orange Cup");
    expect(names).toContain("Club Friendlies");
  });
});

describe("matchCompetition", () => {
  const competitions = builtInCompetitions();

  it("matches an exact stored name", () => {
    expect(matchCompetition(competitions, "LFA Women\u2019s First Division")?.slug).toBe(
      "lfa-womens-first-division",
    );
  });

  it("matches the short name", () => {
    expect(matchCompetition(competitions, "Orange Cup")?.slug).toBe("womens-orange-cup");
  });

  it("matches a value carrying a round suffix", () => {
    // Fixtures may store "Women's Orange Cup · Final" from an import.
    expect(matchCompetition(competitions, "Women\u2019s Orange Cup \u00b7 Final")?.slug).toBe(
      "womens-orange-cup",
    );
    expect(matchCompetition(competitions, "Orange Cup \u00b7 Semi-final")?.slug).toBe(
      "womens-orange-cup",
    );
  });

  it("returns null for an unknown or absent value", () => {
    expect(matchCompetition(competitions, "Some Other Cup")).toBeNull();
    expect(matchCompetition(competitions, "")).toBeNull();
    expect(matchCompetition(competitions, null)).toBeNull();
    expect(matchCompetition(competitions, undefined)).toBeNull();
  });

  it("prefers an exact match over a suffix match", () => {
    // A competition literally named "Orange Cup · Final" must win over the
    // prefix match on "Orange Cup".
    const withExact = [...competitions, { slug: "exact", name: "Orange Cup · Final", short: "Final" }];
    expect(matchCompetition(withExact, "Orange Cup · Final")?.slug).toBe("exact");
  });
});

describe("closed sets", () => {
  it("has the four positions the seed data uses", () => {
    expect(POSITIONS).toEqual(["Goalkeeper", "Defender", "Midfielder", "Forward"]);
  });

  it("maps every position to a display group", () => {
    // The team page filters on these labels, so a position with no group would
    // render a player no filter can select.
    expect(POSITION_GROUPS.map((group) => group.key).sort()).toEqual([...POSITIONS].sort());
  });

  it("uses the club's own wording for the lines", () => {
    const labels = POSITION_GROUPS.map((group) => group.label);
    expect(labels).toContain("Goalkeepers");
    expect(labels).toContain("Attackers");
  });

  it("has the three feet", () => {
    expect(FEET).toEqual(["right", "left", "both"]);
  });

  it("has the three venue types the schema allows", () => {
    // venue_type CHECK in 20260928202929_fixtures_results.sql
    expect(VENUE_TYPES.map((entry) => entry.value)).toEqual(["home", "away", "neutral"]);
  });

  it("has the four match statuses the schema allows", () => {
    // status CHECK in 20260928202929_fixtures_results.sql
    expect(MATCH_STATUSES.map((entry) => entry.value)).toEqual([
      "scheduled",
      "played",
      "postponed",
      "cancelled",
    ]);
  });

  it("suggests article categories without closing the list", () => {
    // A datalist suggests; a select constrains. The club may add a category
    // without a deploy, so this must not become a closed set.
    expect(ARTICLE_CATEGORIES.length).toBeGreaterThan(3);
    expect(ARTICLE_CATEGORIES).toContain("Match report");
  });
});
