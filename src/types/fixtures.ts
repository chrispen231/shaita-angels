export const fixtureStatuses = ["scheduled", "played", "postponed", "cancelled"] as const;
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
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type FixtureActionState = {
  status: "idle" | "success" | "error";
  message: string;
};
