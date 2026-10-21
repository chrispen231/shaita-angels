"use server";

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/supabase/config";
import { getAdminContext } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validateFixture } from "@/lib/fixtures/validation";
import { logAdminAction } from "@/lib/admin/audit";
import { canAccess, type AdminContext } from "@/lib/admin/roles";
import { getCompetitionsForAdmin } from "@/lib/reference-data.server";
import { parseBulkFixtures, MAX_BULK_LINES } from "@/lib/fixtures/bulk-paste";
import { generateSeriesDates } from "@/lib/fixtures/recurrence";
import {
  duplicateSearchRange,
  findBatchDuplicates,
  findDuplicates,
  hasAnyDuplicate,
  type DuplicateCandidate,
  type ExistingFixture,
} from "@/lib/fixtures/duplicates";
import type { FixtureInput } from "@/lib/fixtures/validation";
import type { FixtureActionState, FixtureSaveState } from "@/types/fixtures";
import { conflictMessage, readExpectedUpdatedAt, staleFormMessage, updateWasRejected } from "@/lib/admin/concurrency";

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

function emptyToNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Saved fixtures near the given dates, for the duplicate check. Read with the
 * admin's own session, so RLS applies as it does everywhere else.
 */
async function nearbyFixtures(context: AdminContext, dates: string[]): Promise<ExistingFixture[]> {
  const range = duplicateSearchRange(dates);
  if (!range) return [];
  const { data, error } = await context.supabase
    .from("fixtures")
    .select("id, opponent, competition, match_date")
    .gte("match_date", range.from)
    .lte("match_date", range.to);
  if (error) console.error("Fixture duplicate check failed", error.message);
  return (data ?? []) as ExistingFixture[];
}

function duplicateLabel(fixture: DuplicateCandidate) {
  return `${fixture.opponent} (${fixture.competition}) on ${fixture.match_date}`;
}

export async function saveFixture(_previous: FixtureSaveState, formData: FormData): Promise<FixtureSaveState> {
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
  if (!( ["scheduled", "played", "live", "halftime", "postponed", "cancelled"] as const).includes(status as "scheduled" | "played" | "live" | "halftime" | "postponed" | "cancelled")) return { status: "error", message: "Choose a valid match status." };

  // A live match may carry a scoreline or none at all; every other non-played
  // status carries none. Mirrors fixtures_scores_match_status.
  let shaitaGoals: number | null = null;
  let opponentGoals: number | null = null;
  if ((status === "played" || status === "live" || status === "halftime") && /^\d{1,2}$/.test(rawFor) && /^\d{1,2}$/.test(rawAgainst)) {
    shaitaGoals = Number(rawFor);
    opponentGoals = Number(rawAgainst);
  }

  // Single source of truth, shared with tests/fixture-validation.test.ts so the
  // form and the database CHECK constraints cannot drift apart silently.
  const invalid = validateFixture({
    opponent, competition, season,
    opponent_logo_url: emptyToNull(field(formData, "opponent_logo_url")),
    opponent_logo_alt: emptyToNull(field(formData, "opponent_logo_alt")),
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
    opponent_logo_url: emptyToNull(field(formData, "opponent_logo_url")),
    opponent_logo_alt: emptyToNull(field(formData, "opponent_logo_alt")),
    venue: venue || null, venue_type: venueType, status,
    shaita_goals: shaitaGoals, opponent_goals: opponentGoals, notes: notes || null,
    is_published: published, updated_at: new Date().toISOString(),
  };

  /*
   * The live clock's start point.
   *
   * went_live_at is stamped on the transition INTO live and left alone after that.
   * Editing a live fixture - correcting the score, fixing a typo in the venue -
   * must not restart the minute counter, which it would if this wrote a fresh
   * timestamp on every save.
   *
   * Read the current value first so the transition can be detected. The read is
   * the admin's own session, so RLS applies as it does everywhere else.
   */
  let wentLiveAt: string | null = null;
  const { data: current } = id
    ? await context.supabase
      .from("fixtures")
      .select("status, went_live_at, opponent, competition, match_date")
      .eq("id", id)
      .maybeSingle()
    : { data: null };

  // Warn before saving what looks like a match that already exists. An edit is
  // checked only when it changes who, what or when, so correcting the score of a
  // fixture that was confirmed as a near-duplicate does not warn every time.
  const identityChanged = !current ||
    current.opponent !== opponent || current.competition !== competition || current.match_date !== matchDate;
  if (identityChanged && formData.get("confirm_duplicate") !== "1") {
    const duplicates = findDuplicates(
      { opponent, competition, match_date: matchDate },
      await nearbyFixtures(context, [matchDate]),
      { excludeId: id || undefined },
    );
    if (duplicates.length > 0) {
      return {
        status: "duplicate",
        message: "This looks like a fixture that already exists. Save it anyway?",
        duplicates,
      };
    }
  }

  if (id) {
    const wasLive = current?.status === "live";
    const existing = current?.went_live_at ?? null;

    if (status === "live") {
      // Keep the original start time when the match was already live; otherwise
      // start the clock now.
      wentLiveAt = wasLive && existing ? existing : new Date().toISOString();
    } else {
      // Leaving live clears it, so a match re-marked live later starts a fresh
      // clock rather than resuming a stale one.
      wentLiveAt = null;
    }
  } else if (status === "live") {
    // A fixture created directly as live starts its clock now.
    wentLiveAt = new Date().toISOString();
  }

  // An edit only lands if the row still carries the updated_at the form was
  // rendered with; otherwise another admin saved first and this would overwrite
  // their changes. See src/lib/admin/concurrency.ts.
  const expectedUpdatedAt = readExpectedUpdatedAt(formData);
  if (id && !expectedUpdatedAt) return { status: "error", message: staleFormMessage("fixture") };

  const { data: written, error } = id
    ? await context.supabase
      .from("fixtures")
      .update({ ...values, went_live_at: wentLiveAt })
      .eq("id", id)
      .eq("updated_at", expectedUpdatedAt!)
      .select("id")
    : await context.supabase.from("fixtures").insert({ ...values, went_live_at: wentLiveAt, created_by: context.user.id });
  if (error) {
    console.error("Fixture save failed", error.message);
    return { status: "error", message: "We couldn’t save that fixture. Check the details and try again." };
  }
  if (id && updateWasRejected(written)) return { status: "error", message: conflictMessage("fixture") };

  // Log the admin action
  await logAdminAction({
    actor_email: context.user.email,
    actor_role: context.role,
    target_type: "fixture",
    target_id: id || "new",
    action: id ? "Updated fixture" : "Created fixture",
    details: { opponent, competition, season, status, venue_type: venueType },
  });

  redirect("/admin?saved=1");
}

/**
 * Insert several new fixtures at once: a bulk paste or a recurring series.
 *
 * Every row has already passed validateFixture. Nothing is saved while any entry
 * looks like a duplicate - of a saved fixture or of another entry in the batch -
 * until the admin confirms. The rows go in as one insert, so a batch is saved
 * whole or not at all, and each created fixture gets its own audit entry.
 */
async function insertFixtureBatch(
  context: AdminContext,
  inputs: FixtureInput[],
  { published, confirmed, source }: { published: boolean; confirmed: boolean; source: string },
): Promise<FixtureSaveState | null> {
  if (!confirmed) {
    const results = findBatchDuplicates(inputs, await nearbyFixtures(context, inputs.map((input) => input.match_date)));
    if (hasAnyDuplicate(results)) {
      const duplicates = results.flatMap((result) => result.existing);
      const repeated = results.flatMap((result, index) => (result.earlier.length ? [inputs[index]] : []));
      const parts = [
        duplicates.length ? `${duplicates.length} look like fixtures that already exist` : "",
        repeated.length ? `${repeated.map(duplicateLabel).join("; ")} ${repeated.length === 1 ? "repeats" : "repeat"} an earlier entry` : "",
      ].filter(Boolean);
      return {
        status: "duplicate",
        message: `Some entries may be duplicates: ${parts.join(", and ")}. Save anyway?`,
        duplicates: [...new Map(duplicates.map((fixture) => [fixture.id, fixture])).values()],
      };
    }
  }

  const now = new Date().toISOString();
  const rows = inputs.map((input) => ({
    opponent: input.opponent,
    competition: input.competition,
    season: input.season,
    match_date: input.match_date,
    kickoff_time: input.kickoff_time || null,
    opponent_logo_url: input.opponent_logo_url,
    opponent_logo_alt: input.opponent_logo_alt,
    venue: input.venue || null,
    venue_type: input.venue_type,
    status: input.status,
    shaita_goals: null,
    opponent_goals: null,
    notes: input.notes || null,
    is_published: published,
    went_live_at: null,
    updated_at: now,
    created_by: context.user.id,
  }));

  const { data, error } = await context.supabase
    .from("fixtures")
    .insert(rows)
    .select("id, opponent, competition, season, status, venue_type");
  if (error) {
    console.error("Fixture batch save failed", error.message);
    return { status: "error", message: "We couldn’t save those fixtures. Nothing was saved. Check the details and try again." };
  }

  for (const created of data ?? []) {
    await logAdminAction({
      actor_email: context.user.email,
      actor_role: context.role,
      target_type: "fixture",
      target_id: created.id,
      action: "Created fixture",
      details: {
        opponent: created.opponent,
        competition: created.competition,
        season: created.season,
        status: created.status,
        venue_type: created.venue_type,
        source,
      },
    });
  }
  return null;
}

async function fixturesEditor(): Promise<AdminContext | FixtureSaveState> {
  const context = await getAdminContext();
  if (!context) return { status: "error", message: "Your admin session is no longer valid. Sign in again." };
  if (!canAccess(context.role, "fixtures")) return { status: "error", message: "Your role cannot manage fixtures." };
  return context;
}

export async function saveFixtureBatch(_previous: FixtureSaveState, formData: FormData): Promise<FixtureSaveState> {
  const context = await fixturesEditor();
  if ("status" in context) return context;

  // Parsed again here rather than trusting the preview the browser showed.
  const lines = parseBulkFixtures(
    String(formData.get("lines") ?? ""),
    { season: field(formData, "season"), competition: field(formData, "competition"), venue_type: field(formData, "venue_type") },
    await getCompetitionsForAdmin(),
  );
  if (lines.length === 0) return { status: "error", message: "Paste at least one fixture, one per line." };
  if (lines.length > MAX_BULK_LINES) return { status: "error", message: `Paste at most ${MAX_BULK_LINES} fixtures at a time.` };
  const failed = lines.filter((line) => line.error);
  if (failed.length > 0) {
    return { status: "error", message: `Nothing was saved. Fix line ${failed.map((line) => line.line).join(", ")} and preview again.` };
  }

  const failure = await insertFixtureBatch(context, lines.map((line) => line.input as FixtureInput), {
    published: formData.get("is_published") === "on",
    confirmed: formData.get("confirm_duplicate") === "1",
    source: "bulk paste",
  });
  if (failure) return failure;
  redirect(`/admin/fixtures?created=${lines.length}`);
}

export async function saveFixtureSeries(_previous: FixtureSaveState, formData: FormData): Promise<FixtureSaveState> {
  const context = await fixturesEditor();
  if ("status" in context) return context;

  const series = generateSeriesDates(
    field(formData, "first_date"),
    Number(field(formData, "every_weeks")),
    Number(field(formData, "count")),
  );
  if (series.error !== null) return { status: "error", message: series.error };

  const base = {
    opponent: field(formData, "opponent"),
    competition: field(formData, "competition"),
    season: field(formData, "season"),
    kickoff_time: field(formData, "kickoff_time"),
    venue: field(formData, "venue"),
    venue_type: field(formData, "venue_type"),
    status: "scheduled",
    shaita_goals: null,
    opponent_goals: null,
    notes: field(formData, "notes"),
    opponent_logo_url: emptyToNull(field(formData, "opponent_logo_url")),
    opponent_logo_alt: emptyToNull(field(formData, "opponent_logo_alt")),
  };
  const inputs: FixtureInput[] = series.dates.map((date) => ({ ...base, match_date: date }));
  for (const input of inputs) {
    const invalid = validateFixture(input);
    if (invalid) return { status: "error", message: invalid };
  }

  const failure = await insertFixtureBatch(context, inputs, {
    published: formData.get("is_published") === "on",
    confirmed: formData.get("confirm_duplicate") === "1",
    source: "recurring series",
  });
  if (failure) return failure;
  redirect(`/admin/fixtures?created=${inputs.length}`);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

