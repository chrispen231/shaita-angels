import { describe, it, expect } from "vitest";
import { orderFixtures } from "@/components/FixtureCarousel";
import type { Fixture } from "@/types/fixtures";

/**
 * The homepage carousel shows next matches before past results, interleaved so
 * the rail does not become a wall of scorelines once a season is under way.
 */

function make(overrides: Partial<Fixture> & { id: string; match_date: string }): Fixture {
  return {
    opponent: "Opponent",
    competition: "Cup",
    season: "2026",
    kickoff_time: null,
    venue: null,
    venue_type: "home",
    status: "scheduled",
    shaita_goals: null,
    opponent_goals: null,
    notes: null,
    is_published: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

describe("orderFixtures", () => {
  it("puts the next upcoming match first", () => {
    const rail = orderFixtures([
      make({ id: "a", match_date: "2026-07-14", status: "played", shaita_goals: 2, opponent_goals: 1 }),
      make({ id: "b", match_date: "2026-11-02" }),
      make({ id: "c", match_date: "2026-09-30" }),
    ]);
    expect(rail[0].id).toBe("c");
  });

  it("orders upcoming matches soonest first", () => {
    const rail = orderFixtures([
      make({ id: "late", match_date: "2026-12-01" }),
      make({ id: "early", match_date: "2026-10-03" }),
      make({ id: "mid", match_date: "2026-11-02" }),
    ]);
    expect(rail.map((f) => f.id)).toEqual(["early", "mid", "late"]);
  });

  it("orders results most recent first", () => {
    const rail = orderFixtures([
      make({ id: "older", match_date: "2026-05-02", status: "played", shaita_goals: 1, opponent_goals: 0 }),
      make({ id: "newest", match_date: "2026-07-14", status: "played", shaita_goals: 2, opponent_goals: 1 }),
    ]);
    expect(rail.map((f) => f.id)).toEqual(["newest", "older"]);
  });

  it("interleaves upcoming and results", () => {
    const rail = orderFixtures([
      make({ id: "u1", match_date: "2026-10-03" }),
      make({ id: "u2", match_date: "2026-11-02" }),
      make({ id: "r1", match_date: "2026-07-14", status: "played", shaita_goals: 2, opponent_goals: 1 }),
    ]);
    expect(rail.map((f) => f.id)).toEqual(["u1", "r1", "u2"]);
  });

  it("treats postponed and cancelled as not-yet-played", () => {
    const rail = orderFixtures([
      make({ id: "cancelled", match_date: "2026-10-01", status: "cancelled" }),
      make({ id: "postponed", match_date: "2026-09-01", status: "postponed" }),
      make({ id: "played", match_date: "2026-07-14", status: "played", shaita_goals: 2, opponent_goals: 1 }),
    ]);
    // Both non-played statuses sort into the upcoming list by date, and the
    // result interleaves after the first one: postponed, played, cancelled.
    expect(rail.map((f) => f.id)).toEqual(["postponed", "played", "cancelled"]);
  });

  it("returns an empty rail when there are no fixtures", () => {
    expect(orderFixtures([])).toEqual([]);
  });

  it("keeps every fixture exactly once", () => {
    const input = [
      make({ id: "u1", match_date: "2026-10-03" }),
      make({ id: "u2", match_date: "2026-11-02" }),
      make({ id: "u3", match_date: "2026-12-01" }),
      make({ id: "r1", match_date: "2026-07-14", status: "played", shaita_goals: 2, opponent_goals: 1 }),
      make({ id: "r2", match_date: "2026-05-02", status: "played", shaita_goals: 0, opponent_goals: 0 }),
    ];
    const rail = orderFixtures(input);
    expect(rail).toHaveLength(input.length);
    expect(new Set(rail.map((f) => f.id)).size).toBe(input.length);
  });

  it("does not mutate the input array", () => {
    const input = [
      make({ id: "r1", match_date: "2026-07-14", status: "played", shaita_goals: 2, opponent_goals: 1 }),
      make({ id: "u1", match_date: "2026-10-03" }),
    ];
    const snapshot = input.map((f) => f.id);
    orderFixtures(input);
    expect(input.map((f) => f.id)).toEqual(snapshot);
  });
});