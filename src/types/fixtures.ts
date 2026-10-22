export const fixtureStatuses = ["scheduled", "played", "live", "halftime", "postponed", "cancelled"] as const;
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
  /**
   * Tactical formation, e.g. "4-4-2", "4-3-3". Null when not set.
   * Validated by fixtures_formation_format constraint.
   */
  formation: string | null;
  is_published: boolean;
  /** Admin-only: no push alerts for this fixture. Not selected on public pages. */
  alerts_muted?: boolean;
  created_at: string;
  updated_at: string;
};

export type FixtureActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

/** An existing fixture a new or edited one looks like a duplicate of. */
export type FixtureDuplicate = {
  id: string;
  opponent: string;
  competition: string;
  match_date: string;
};

/**
 * State for the fixtures editor's save actions. "duplicate" means nothing was
 * saved because the entry looks like a fixture that already exists; the form
 * shows the matches and offers to save anyway.
 */
export type FixtureSaveState = {
  status: FixtureActionState["status"] | "duplicate";
  message: string;
  duplicates?: FixtureDuplicate[];
};
