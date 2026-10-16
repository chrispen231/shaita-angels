export const fixtureStatuses = ["scheduled", "played", "live", "postponed", "cancelled"] as const;
export type FixtureStatus = (typeof fixtureStatuses)[number];

export type Fixture = {
  id: string;
  opponent: string;
  competition: string;
  season: string;
  match_date: string;
  kickoff_time: string | null;
  venue: string | null;
  venue_type: "home" | "away" | "neutral";
  status: FixtureStatus;
  shaita_goals: number | null;
  opponent_goals: number | null;
  notes: string | null;
  /** Public URL of the opponent crest. Null falls back to the initials on the card. */
  opponent_logo_url: string | null;
  opponent_logo_alt: string | null;
  /**
   * When the match was marked live. The minute counter runs from here rather than
   * from kickoff_time, so a delayed start shows the right minute. Null when the
   * match has never been live.
   */
  went_live_at: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type FixtureActionState = {
  status: "idle" | "success" | "error";
  message: string;
};
