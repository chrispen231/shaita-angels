import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatMinute, describeGoal, type Side, type CardType } from "@/lib/matches/validation";

/**
 * Public match content: lineups, goals, cards and the report.
 *
 * Every query here runs as `anon` against the public policies in
 * 20261005150000_match_content.sql, so it can only see rows belonging to a
 * published fixture.
 *
 * One rule matters more than any other in this file: **no query selects
 * date_of_birth**. It is not merely omitted from the select list, it is
 * unreachable - anon has no grant on that column at all, so a query that asked
 * for it would error rather than leak. Nothing in the public layer needs it;
 * the profile renders an age computed from a separately fetched value in Phase4,
 * where that grant decision is revisited deliberately.
 */

export type PublicLineupRow = {
  player_name: string;
  shirt_number: number | null;
  position: string | null;
  is_starter: boolean;
  sort_order: number;
};

export type PublicGoalRow = {
  player_name: string;
  side: Side;
  minute: number;
  added_stoppage_minutes: boolean;
  is_own_goal: boolean;
  assist_note: string | null;
  sort_order: number;
};

export type PublicCardRow = {
  player_name: string;
  side: Side;
  card: CardType;
  minute: number;
  added_stoppage_minutes: boolean;
  sort_order: number;
};

export type MatchContent = {
  lineup: PublicLineupRow[];
  goals: PublicGoalRow[];
  cards: PublicCardRow[];
  report: string | null;
  /** True when the club entered nothing at all for this match. */
  isEmpty: boolean;
};

/**
 * Cached per request. A match page runs several components that all need the same
 * four rows; without this the public read policy is hit repeatedly for one view.
 */
export const getMatchContent = cache(async (fixtureId: string): Promise<MatchContent> => {
  const supabase = await createClient();

  const [lineup, goals, cards, report] = await Promise.all([
    supabase
      .from("lineups")
      .select("player_name, shirt_number, position, is_starter, sort_order")
      .eq("fixture_id", fixtureId)
      .order("is_starter", { ascending: false })
      .order("sort_order", { ascending: true }),
    supabase
      .from("match_goals")
      .select("player_name, side, minute, added_stoppage_minutes, is_own_goal, assist_note, sort_order")
      .eq("fixture_id", fixtureId)
      .order("minute", { ascending: true }),
    supabase
      .from("match_cards")
      .select("player_name, side, card, minute, added_stoppage_minutes, sort_order")
      .eq("fixture_id", fixtureId)
      .order("minute", { ascending: true }),
    supabase.from("match_reports").select("body").eq("fixture_id", fixtureId).maybeSingle(),
  ]);

  const content: MatchContent = {
    lineup: (lineup.data ?? []) as PublicLineupRow[],
    goals: (goals.data ?? []) as PublicGoalRow[],
    cards: (cards.data ?? []) as PublicCardRow[],
    report: report.data?.body ? String(report.data.body) : null,
    isEmpty:
      (lineup.data?.length ?? 0) === 0 &&
      (goals.data?.length ?? 0) === 0 &&
      (cards.data?.length ?? 0) === 0 &&
      !report.data,
  };

  return content;
});

/** A display line for one goal, e.g. "67' Grace FC". */
export function goalLine(goal: PublicGoalRow): string {
  return `${formatMinute(goal.minute, goal.added_stoppage_minutes)} ${describeGoal(goal)}`;
}

/** A display line for one card, e.g. "23' Ruth FC (yellow)". */
export function cardLine(card: PublicCardRow): string {
  const colour = card.card === "second_yellow" ? "second yellow" : card.card;
  return `${formatMinute(card.minute, card.added_stoppage_minutes)} ${card.player_name} (${colour})`;
}

/**
 * Counts derived from recorded goals, per side.
 *
 * An own goal is credited to the side it counted FOR, which is why side and
 * is_own_goal are both needed: a player putting the ball in their own net is a
 * goal for the opposition.
 */
export function goalCounts(goals: PublicGoalRow[]): { shaita: number; opponent: number } {
  let shaita = 0;
  let opponent = 0;

  for (const goal of goals) {
    const countedFor: Side = goal.is_own_goal
      ? goal.side === "shaita"
        ? "opponent"
        : "shaita"
      : goal.side;
    if (countedFor === "shaita") shaita += 1;
    else opponent += 1;
  }

  return { shaita, opponent };
}

/** Splits a lineup into starters and bench, preserving the club's ordering. */
export function splitLineup(lineup: PublicLineupRow[]) {
  return {
    starters: lineup.filter((row) => row.is_starter),
    bench: lineup.filter((row) => !row.is_starter),
  };
}
