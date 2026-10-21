import { describe, it, expect } from "vitest";
import { parseBulkFixtures, parseFixtureLine, type BulkDefaults } from "@/lib/fixtures/bulk-paste";
import { generateSeriesDates, weekdayName, MAX_SERIES_LENGTH } from "@/lib/fixtures/recurrence";
import {
  duplicateSearchRange,
  findBatchDuplicates,
  findDuplicates,
  hasAnyDuplicate,
  isSameFixture,
  type ExistingFixture,
} from "@/lib/fixtures/duplicates";
import { builtInCompetitions } from "@/lib/reference-data";

/**
 * The fixtures editor's bulk paste, recurring series and duplicate check. The
 * save actions run these same functions on the server, so these tests cover
 * what reaches the database as well as what the preview shows.
 */

const competitions = builtInCompetitions();
const firstDivision = competitions.find((entry) => /first division/i.test(entry.name))!.name;
const orangeCup = competitions.find((entry) => /orange cup/i.test(entry.name))!.name;

const defaults: BulkDefaults = { season: "2026–27", competition: firstDivision, venue_type: "home" };

describe("bulk paste parsing", () => {
  it("parses a full bar-separated line", () => {
    const { input, error } = parseFixtureLine("2026-11-07 | World Girls | Orange Cup | 15:00 | SKD Sports Complex | away", defaults, competitions);
    expect(error).toBeNull();
    expect(input).toMatchObject({
      match_date: "2026-11-07",
      opponent: "World Girls",
      competition: orangeCup,
      kickoff_time: "15:00",
      venue: "SKD Sports Complex",
      venue_type: "away",
      season: "2026–27",
      status: "scheduled",
      shaita_goals: null,
      opponent_goals: null,
    });
  });

  it("parses a tab-separated row copied from a spreadsheet", () => {
    const { input, error } = parseFixtureLine("2026-11-07\tWorld Girls\t\t\tSKD, Paynesville\tn", defaults, competitions);
    expect(error).toBeNull();
    expect(input).toMatchObject({ venue: "SKD, Paynesville", venue_type: "neutral", competition: firstDivision });
  });

  it("falls back to the defaults when only date and opponent are given", () => {
    const { input } = parseFixtureLine("2026-11-07 | Earth Angels", defaults, competitions);
    expect(input).toMatchObject({ competition: firstDivision, venue_type: "home", kickoff_time: "", venue: "" });
  });

  it("keeps a round suffix on a recognised competition", () => {
    const { input } = parseFixtureLine("2026-11-07 | World Girls | Orange Cup · Final", defaults, competitions);
    expect(input?.competition).toBe(`${orangeCup} · Final`);
  });

  it.each([
    ["07/11/2026 | World Girls", /YYYY-MM-DD/],
    ["2026-02-30 | World Girls", /real calendar date|valid match date/],
    ["2026-13-01 | World Girls", /real calendar date|valid match date/],
    ["2026-11-07 |  ", /opponent is missing/],
    ["2026-11-07 | World Girls | Champions League", /not a known competition/],
    ["2026-11-07 | World Girls | | | | stadium", /not a venue type/],
    ["2026-11-07 | World Girls | | 3pm", /HH:MM/],
    [`2026-11-07 | ${"a".repeat(101)}`, /opponent, competition, and season/],
    ["2026-11-07 | a | b | c | d | e | f", /Too many columns/],
  ])("reports an error for %s", (line, message) => {
    const { input, error } = parseFixtureLine(line, defaults, competitions);
    expect(input).toBeNull();
    expect(error).toMatch(message);
  });

  it("runs every line through validateFixture, so a missing season is caught", () => {
    const { error } = parseFixtureLine("2026-11-07 | World Girls", { ...defaults, season: "" }, competitions);
    expect(error).toMatch(/opponent, competition, and season/i);
  });

  it("numbers lines as pasted and skips blank and # lines", () => {
    const parsed = parseBulkFixtures(
      "# date | opponent\n2026-11-07 | World Girls\n\n2026-11-14 | Earth Angels\r\nnot a fixture\n",
      defaults,
      competitions,
    );
    expect(parsed.map((line) => line.line)).toEqual([2, 4, 5]);
    expect(parsed[0].error).toBeNull();
    expect(parsed[1].input?.opponent).toBe("Earth Angels");
    expect(parsed[2].error).toMatch(/not a date/);
  });

  it("returns nothing for empty text", () => {
    expect(parseBulkFixtures("  \n\n", defaults, competitions)).toEqual([]);
  });
});

describe("recurring series", () => {
  it("creates every Saturday for N weeks", () => {
    const series = generateSeriesDates("2026-10-24", 1, 4);
    expect(series).toEqual({ dates: ["2026-10-24", "2026-10-31", "2026-11-07", "2026-11-14"], error: null });
    expect(series.dates.map(weekdayName)).toEqual(["Saturday", "Saturday", "Saturday", "Saturday"]);
  });

  it("repeats every few weeks and crosses month and year ends", () => {
    expect(generateSeriesDates("2026-12-19", 2, 3).dates).toEqual(["2026-12-19", "2027-01-02", "2027-01-16"]);
  });

  it("is not shifted by a daylight-saving change", () => {
    expect(generateSeriesDates("2026-03-07", 1, 3).dates).toEqual(["2026-03-07", "2026-03-14", "2026-03-21"]);
  });

  it.each([
    ["2026-02-30", 1, 4, /valid first match date/],
    ["", 1, 4, /valid first match date/],
    ["2026-10-24", 0, 4, /Repeat every/],
    ["2026-10-24", 5, 4, /Repeat every/],
    ["2026-10-24", 1.5, 4, /Repeat every/],
    ["2026-10-24", 1, 1, /between 2 and/],
    ["2026-10-24", 1, MAX_SERIES_LENGTH + 1, /between 2 and/],
    ["2026-10-24", 1, Number.NaN, /between 2 and/],
  ])("rejects %s every %s weeks x %s", (date, weeks, count, message) => {
    const series = generateSeriesDates(date, weeks, count);
    expect(series.dates).toEqual([]);
    expect(series.error).toMatch(message);
  });
});

describe("duplicate detection", () => {
  const existing: ExistingFixture[] = [
    { id: "a", opponent: "World Girls", competition: "Women’s Orange Cup · Final", match_date: "2026-11-07" },
    { id: "b", opponent: "Earth Angels", competition: firstDivision, match_date: "2026-11-14" },
  ];

  it("matches the same opponent and competition a few days apart", () => {
    expect(findDuplicates({ opponent: "World Girls", competition: "Women's Orange Cup", match_date: "2026-11-09" }, existing).map((f) => f.id)).toEqual(["a"]);
  });

  it("ignores case, apostrophe style, punctuation and spacing", () => {
    expect(isSameFixture(
      { opponent: "  world  girls. ", competition: "WOMEN'S ORANGE CUP", match_date: "2026-11-07" },
      existing[0],
    )).toBe(true);
  });

  it("does not match outside the window", () => {
    expect(findDuplicates({ opponent: "World Girls", competition: orangeCup, match_date: "2026-11-11" }, existing)).toEqual([]);
    expect(findDuplicates({ opponent: "World Girls", competition: orangeCup, match_date: "2026-11-04" }, existing).map((f) => f.id)).toEqual(["a"]);
    expect(findDuplicates({ opponent: "World Girls", competition: orangeCup, match_date: "2026-11-11" }, existing, { windowDays: 4 })).toHaveLength(1);
  });

  it("does not match a different opponent or a different competition", () => {
    expect(findDuplicates({ opponent: "World Girls", competition: firstDivision, match_date: "2026-11-07" }, existing)).toEqual([]);
    expect(findDuplicates({ opponent: "World Stars", competition: orangeCup, match_date: "2026-11-07" }, existing)).toEqual([]);
  });

  it("leaves out the fixture being edited", () => {
    expect(findDuplicates(existing[1], existing, { excludeId: "b" })).toEqual([]);
  });

  it("checks a batch against saved fixtures and against earlier entries", () => {
    const results = findBatchDuplicates([
      { opponent: "Earth Angels", competition: firstDivision, match_date: "2026-11-15" },
      { opponent: "Mighty Barrolle", competition: firstDivision, match_date: "2026-11-21" },
      { opponent: "Mighty Barrolle", competition: firstDivision, match_date: "2026-11-21" },
    ], existing);
    expect(results.map((result) => result.existing.map((f) => f.id))).toEqual([["b"], [], []]);
    expect(results.map((result) => result.earlier)).toEqual([[], [], [1]]);
    expect(hasAnyDuplicate(results)).toBe(true);
    expect(hasAnyDuplicate(findBatchDuplicates([{ opponent: "New Club", competition: firstDivision, match_date: "2026-11-21" }], existing))).toBe(false);
  });

  it("does not treat a weekly series against one opponent as duplicates of itself", () => {
    const series = generateSeriesDates("2026-10-24", 1, 4).dates.map((date) => ({ opponent: "Training XI", competition: "Club Friendlies", match_date: date }));
    expect(hasAnyDuplicate(findBatchDuplicates(series, []))).toBe(false);
  });

  it("covers the window either side of the dates being checked", () => {
    expect(duplicateSearchRange(["2026-11-14", "2026-11-07"])).toEqual({ from: "2026-11-04", to: "2026-11-17" });
    expect(duplicateSearchRange([])).toBeNull();
  });
});
