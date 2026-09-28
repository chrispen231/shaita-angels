import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Fixture } from "@/types/fixtures";

// null means Supabase is not configured; an empty array means it is configured
// but there are currently no published matches (or the query failed).
export async function getPublishedFixtures(): Promise<Fixture[] | null> {
  if (!getSupabaseConfig()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fixtures")
    .select("id, opponent, competition, season, match_date, kickoff_time, venue, venue_type, status, shaita_goals, opponent_goals, notes, is_published, created_at, updated_at")
    .eq("is_published", true)
    .order("match_date", { ascending: true });

  if (error || !data) return [];
  return data as Fixture[];
}

export function formatMatchDate(date: string) {
  return new Intl.DateTimeFormat("en-LR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatKickoff(time: string | null) {
  if (!time) return null;
  return time.slice(0, 5);
}
