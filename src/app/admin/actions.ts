"use server";

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/supabase/config";
import { getAdminContext } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { FixtureActionState } from "@/types/fixtures";

export async function requestAdminLink(_previous: FixtureActionState, formData: FormData): Promise<FixtureActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: "Enter a valid email address." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/admin` },
    });
    if (error) console.error("Admin sign-in link request failed", error.message);
  } catch (error) {
    console.error("Admin sign-in is unavailable", error);
    return { status: "error", message: "Sign-in is not configured yet. Please try again later." };
  }
  return { status: "success", message: "If this address is authorized, a secure sign-in link will arrive shortly." };
}

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function saveFixture(_previous: FixtureActionState, formData: FormData): Promise<FixtureActionState> {
  const context = await getAdminContext();
  if (!context) return { status: "error", message: "Your admin session is no longer valid. Sign in again." };

  const id = field(formData, "id");
  const opponent = field(formData, "opponent");
  const competition = field(formData, "competition");
  const season = field(formData, "season");
  const matchDate = field(formData, "match_date");
  const kickoff = field(formData, "kickoff_time");
  const venue = field(formData, "venue");
  const venueType = field(formData, "venue_type");
  const status = field(formData, "status");
  const notes = field(formData, "notes");
  const published = formData.get("is_published") === "on";
  const rawFor = field(formData, "shaita_goals");
  const rawAgainst = field(formData, "opponent_goals");

  if (!opponent || opponent.length > 100 || !competition || competition.length > 120 || !season || season.length > 30) {
    return { status: "error", message: "Check opponent, competition, and season. One or more fields are empty or too long." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(matchDate) || Number.isNaN(Date.parse(`${matchDate}T00:00:00Z`))) return { status: "error", message: "Enter a valid match date." };
  if (!(["home", "away", "neutral"] as const).includes(venueType as "home" | "away" | "neutral")) return { status: "error", message: "Choose a valid venue type." };
  if (!( ["scheduled", "played", "postponed", "cancelled"] as const).includes(status as "scheduled" | "played" | "postponed" | "cancelled")) return { status: "error", message: "Choose a valid match status." };

  let shaitaGoals: number | null = null;
  let opponentGoals: number | null = null;
  if (status === "played") {
    if (!/^\d{1,2}$/.test(rawFor) || !/^\d{1,2}$/.test(rawAgainst)) return { status: "error", message: "Played matches need both scores (0–99)." };
    shaitaGoals = Number(rawFor);
    opponentGoals = Number(rawAgainst);
  }
  if (venue.length > 160 || notes.length > 2000) return { status: "error", message: "Venue or notes exceed the allowed length." };
  if (kickoff && !/^([01]\d|2[0-3]):[0-5]\d$/.test(kickoff)) return { status: "error", message: "Enter kickoff time in 24-hour HH:MM format." };

  const values = {
    opponent, competition, season, match_date: matchDate, kickoff_time: kickoff || null,
    venue: venue || null, venue_type: venueType, status,
    shaita_goals: shaitaGoals, opponent_goals: opponentGoals, notes: notes || null,
    is_published: published, updated_at: new Date().toISOString(),
  };
  const query = id
    ? context.supabase.from("fixtures").update(values).eq("id", id)
    : context.supabase.from("fixtures").insert({ ...values, created_by: context.user.id });
  const { error } = await query;
  if (error) {
    console.error("Fixture save failed", error.message);
    return { status: "error", message: "We couldn’t save that fixture. Check the details and try again." };
  }
  redirect("/admin?saved=1");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
