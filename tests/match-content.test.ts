import { describe, it, expect } from "vitest";
import {
  goalCounts,
  goalLine,
  cardLine,
  splitLineup,
  type PublicGoalRow,
  type PublicCardRow,
  type PublicLineupRow,
} from "@/lib/matches/content";

/**
 * These are the derivations the public match page shows. They are pure functions
 * precisely so the numbers can be checked without a database.
 */

const goal = (over: Partial<PublicGoalRow> = {}): PublicGoalRow => ({
  player_name: "Grace",
  side: "shaita",
  minute: 23,
  added_stoppage_minutes: false,
  is_own_goal: false,
  assist_note: null,
  sort_order: 0,
  ...over,
});

const card = (over: Partial<PublicCardRow> = {}): PublicCardRow => ({
  player_name: "Ruth",
  side: "shaita",
  card: "yellow",
  minute: 30,
  added_stoppage_minutes: false,
  sort_order: 0,
  ...over,
});

const player = (over: Partial<PublicLineupRow> = {}): PublicLineupRow => ({
  player_name: "Player",
  shirt_number: null,
  position: null,
  is_starter: true,
  sort_order: 0,
  ...over,
});

describe("goalCounts", () => {
  it("counts zero for no goals", () => {
    expect(goalCounts([])).toEqual({ shaita: 0, opponent: 0 });
  });

  it("counts each side", () => {
    expect(
      goalCounts([goal({ side: "shaita" }), goal({ side: "shaita" }), goal({ side: "opponent" })]),
    ).toEqual({ shaita: 2, opponent: 1 });
  });

  it("credits a Shaita own goal to the opponent", () => {
    // The whole point of storing is_own_goal alongside side: a player putting the
    // ball in their own net is a goal for the opposition.
    expect(goalCounts([goal({ side: "shaita", is_own_goal: true })])).toEqual({
      shaita: 0,
      opponent: 1,
    });
  });

  it("credits an opponent own goal to Shaita", () => {
    expect(goalCounts([goal({ side: "opponent", is_own_goal: true })])).toEqual({
      shaita: 1,
      opponent: 0,
    });
  });

  it("handles a scrappy game with own goals both ways", () => {
    expect(
      goalCounts([
        goal({ side: "shaita" }),
        goal({ side: "shaita", is_own_goal: true }),
        goal({ side: "opponent" }),
        goal({ side: "opponent", is_own_goal: true }),
      ]),
    ).toEqual({ shaita: 2, opponent: 2 });
  });
});

describe("goalLine", () => {
  it("renders minute and scorer", () => {
    expect(goalLine(goal({ minute: 67 }))).toBe("67' Grace");
  });

  it("renders stoppage time correctly", () => {
    expect(goalLine(goal({ minute: 93, added_stoppage_minutes: true }))).toBe("90+3' Grace");
    expect(goalLine(goal({ minute: 47, added_stoppage_minutes: true }))).toBe("45+2' Grace");
  });

  it("marks an own goal", () => {
    expect(goalLine(goal({ is_own_goal: true }))).toBe("23' Own goal, Grace");
  });
});

describe("cardLine", () => {
  it("renders a yellow card", () => {
    expect(cardLine(card({ minute: 23 }))).toBe("23' Ruth (yellow)");
  });

  it("spells out a second yellow", () => {
    expect(cardLine(card({ card: "second_yellow" }))).toBe("30' Ruth (second yellow)");
  });

  it("renders a red card", () => {
    expect(cardLine(card({ card: "red" }))).toBe("30' Ruth (red)");
  });
});

describe("splitLineup", () => {
  it("separates starters from the bench", () => {
    const { starters, bench } = splitLineup([
      player({ player_name: "A", is_starter: true }),
      player({ player_name: "B", is_starter: false }),
      player({ player_name: "C", is_starter: true }),
    ]);
    expect(starters.map((p) => p.player_name)).toEqual(["A", "C"]);
    expect(bench.map((p) => p.player_name)).toEqual(["B"]);
  });

  it("preserves the club's ordering rather than sorting", () => {
    const { starters } = splitLineup([
      player({ player_name: "Keeper", sort_order: 0 }),
      player({ player_name: "Striker", sort_order: 1 }),
    ]);
    expect(starters.map((p) => p.player_name)).toEqual(["Keeper", "Striker"]);
  });

  it("handles an empty lineup", () => {
    expect(splitLineup([])).toEqual({ starters: [], bench: [] });
  });

  it("handles a squad with no substitutes named", () => {
    const { bench } = splitLineup([player({ is_starter: true })]);
    expect(bench).toEqual([]);
  });
});
