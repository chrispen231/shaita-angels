"use server";

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/supabase/config";
import { getAdminContext } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validateFixture } from "@/lib/fixtures/validation";
import type { FixtureActionState } from "@/types/fixtures";

export async function signInAdmin(_previous: FixtureActionState, formData: FormData): Promise<FixtureActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) return { status: "error", message: "Enter your email and password." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { status: "error", message: "Email or password is incorrect, or this account is not authorized." };
    const context = await getAdminContext();
    if (!context) {
      await supabase.auth.signOut();
      return { status: "error", message: "Email or password is incorrect, or this account is not authorized." };
    }
  } catch (error) {
    console.error("Admin password sign-in is unavailable", error);
    return { status: "error", message: "Sign-in is not configured yet. Please try again later." };
  }
  redirect("/admin");
}

export async function requestPasswordReset(_previous: FixtureActionState, formData: FormData): Promise<FixtureActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: "Enter a valid email address." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/admin/password`,
    });
    if (error) console.error("Admin password reset request failed", error.message);
  } catch (error) {
    console.error("Admin password reset is unavailable", error);
    return { status: "error", message: "Password reset is unavailable right now. Please try again later." };
  }
  return { status: "success", message: "If an account exists for that address, a password reset link will arrive shortly." };
}

export async function updateAdminPassword(_previous: FixtureActionState, formData: FormData): Promise<FixtureActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");
  if (password.length < 12) return { status: "error", message: "Use a password with at least 12 characters." };
  if (password !== confirmation) return { status: "error", message: "The passwords do not match." };
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { status: "error", message: "Your password reset session is invalid or has expired. Request a new reset link." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { status: "error", message: "We couldn’t update your password. Use a longer password and try again." };
    const context = await getAdminContext();
    if (!context) {
      await supabase.auth.signOut();
      return { status: "error", message: "This account is not authorized to access club administration." };
    }
  } catch (error) {
    console.error("Admin password update failed", error);
    return { status: "error", message: "Password update is unavailable right now. Please try again later." };
  }
  redirect("/admin");
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
  if (status === "played" && /^\d{1,2}$/.test(rawFor) && /^\d{1,2}$/.test(rawAgainst)) {
    shaitaGoals = Number(rawFor);
    opponentGoals = Number(rawAgainst);
  }

  // Single source of truth, shared with tests/fixture-validation.test.ts so the
  // form and the database CHECK constraints cannot drift apart silently.
  const invalid = validateFixture({
    opponent, competition, season,
    match_date: matchDate,
    kickoff_time: kickoff,
    venue,
    venue_type: venueType,
    status,
    shaita_goals: shaitaGoals,
    opponent_goals: opponentGoals,
    notes,
  });
  if (invalid) return { status: "error", message: invalid };

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
