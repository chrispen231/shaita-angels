"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/roles";
import {
  validateLineup,
  validateMinute,
  validatePlayerName,
  validateSide,
  validateCardType,
  validateAssistNote,
  validateReport,
  validateGoalForMinute,
  type LineupInput,
  type Side,
} from "@/lib/matches/validation";
import type { FixtureActionState } from "@/types/fixtures";

/**
 * Match content writes: lineups, goals, cards and the match report.
 *
 * Fixture editors and super admins only. The role check here produces a readable
 * message; RLS is what actually prevents the write.
 *
 * Two conventions across every action:
 *
 *   * Lineups, goals and cards are replaced wholesale rather than diffed row by
 *     row. The editor submits the whole set it is showing, so a delete is an
 *     explicit removal by the contributor rather than an inferred side effect.
 *     It also keeps the shirt-number uniqueness check meaningful: a diff would
 *     let number 7 move between players without ever conflicting.
 *
 *   * A fixture is still never deletable, only unpublishable. That has not
 *     changed, and the UI says so.
 */

async function requireFixtureEditor() {
  const context = await getAdminContext();
  if (!context) throw new Error("Sign in to edit match content.");
  if (context.role !== "super_admin" && context.role !== "fixtures") {
    throw new Error("Your role does not include match editing.");
  }
  return context;
}

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const UUID = /^[0-9a-f-]{36}$/i;

/** Rejects anything that is not a fixture id before it reaches a query. */
function fixtureIdFrom(formData: FormData) {
  const id = field(formData, "fixture_id");
  if (!UUID.test(id)) throw new Error("Unknown match.");
  return id;
}

/** Collects the repeatable row fields a lineup / goals / cards form submits. */
function rows(formData: FormData, prefix: string) {
  const names = formData.getAll(`${prefix}_name`).map(String);
  return names.map((name, index) => {
    const at = (key: string) => String(formData.get(`${prefix}_${key}_${index}`) ?? "").trim();
    return {
      player_name: name.trim(),
      shirt_number: at("shirt"),
      position: at("position"),
      side: at("side"),
      minute: at("minute"),
      added_stoppage: at("stoppage") === "on" || at("stoppage") === "true",
      is_own_goal: at("own_goal") === "on" || at("own_goal") === "true",
      card: at("card"),
      assist_note: at("note"),
      sort_order: index,
    };
  });
}

// =============================================================================
// Lineups
// =============================================================================

export async function saveLineup(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireFixtureEditor();
  const fixtureId = fixtureIdFrom(formData);

  const submitted = rows(formData, "lineup");
  const players = await context.supabase.from("squad").select("id, full_name");

  // Rows with no name are empty inputs from the "add player" button, not errors.
  const filled = submitted.filter((row) => row.player_name.length > 0);

  const input: LineupInput[] = filled.map((row, index) => ({
    player_name: row.player_name,
    shirt_number: row.shirt_number,
    position: row.position,
    is_starter: formData.get(`lineup_starter_${index}`) === "on",
  }));

  // Sort order comes from the submitted row order, not from LineupInput, which
  // deliberately carries only what validation needs. Reading it off the validated
  // shape would silently write every player at 0 and lose the club's ordering.
  const orderByName = new Map(filled.map((row, index) => [row.player_name, index]));

  const error = validateLineup(input);
  if (error) return { status: "error", message: error };

  // Link to a squad record where the name matches, so player statistics can be
  // aggregated across matches. An unmatched name is fine: opponents and
  // players not yet in the squad list still get a lineup row.
  const byName = new Map(
    (players.data ?? []).map((player) => [String(player.full_name).trim().toLowerCase(), player.id]),
  );

  const { error: deleteError } = await context.supabase
    .from("lineups")
    .delete()
    .eq("fixture_id", fixtureId);

  if (deleteError) {
    console.error("Lineup clear failed", deleteError.message);
    return { status: "error", message: "We couldn't replace the lineup. Try again." };
  }

  const payload = input.map((row) => {
    const trimmed = row.player_name.trim();
    const matched = byName.get(trimmed.toLowerCase());
    return {
      fixture_id: fixtureId,
      player_id: matched ?? null,
      player_name: trimmed,
      shirt_number: row.shirt_number === "" ? null : Number(row.shirt_number),
      position: row.position || null,
      is_starter: row.is_starter,
      sort_order: orderByName.get(row.player_name) ?? 0,
    };
  });

  const { error: insertError } = await context.supabase.from("lineups").insert(payload);

  if (insertError) {
    // 23505 is the partial unique index on (fixture_id, shirt_number).
    if (insertError.code === "23505") {
      return { status: "error", message: "Two players share a shirt number in this match." };
    }
    console.error("Lineup insert failed", insertError.message);
    return { status: "error", message: "We couldn't save the lineup." };
  }

  revalidatePath(`/admin/matches/${fixtureId}`);
  revalidatePath(`/match/${fixtureId}`);
  return { status: "success", message: `Lineup saved with ${payload.length} players.` };
}

// =============================================================================
// Goals
// =============================================================================

export async function saveGoals(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireFixtureEditor();
  const fixtureId = fixtureIdFrom(formData);

  const filled = rows(formData, "goal").filter((row) => row.player_name.length > 0);

  for (const row of filled) {
    const nameError = validatePlayerName(row.player_name);
    if (nameError) return { status: "error", message: nameError };

    const sideError = validateSide(row.side);
    if (sideError) return { status: "error", message: sideError };

    const minuteError = validateGoalForMinute(Number(row.minute), row.added_stoppage);
    if (minuteError) return { status: "error", message: minuteError };

    const noteError = validateAssistNote(row.assist_note);
    if (noteError) return { status: "error", message: noteError };
  }

  const players = await context.supabase.from("squad").select("id, full_name");
  const byName = new Map(
    (players.data ?? []).map((player) => [String(player.full_name).trim().toLowerCase(), player.id]),
  );

  const { error: deleteError } = await context.supabase
    .from("match_goals")
    .delete()
    .eq("fixture_id", fixtureId);
  if (deleteError) {
    console.error("Goal clear failed", deleteError.message);
    return { status: "error", message: "We couldn't replace the goals. Try again." };
  }

  if (filled.length === 0) {
    revalidatePath(`/admin/matches/${fixtureId}`);
    revalidatePath(`/match/${fixtureId}`);
    return { status: "success", message: "All goals removed." };
  }

  const payload = filled.map((row) => {
    const matched = byName.get(row.player_name.trim().toLowerCase());
    return {
      fixture_id: fixtureId,
      player_id: matched ?? null,
      player_name: row.player_name.trim(),
      side: row.side as Side,
      minute: Number(row.minute),
      added_stoppage_minutes: row.added_stoppage,
      is_own_goal: row.is_own_goal,
      assist_note: row.assist_note || null,
      sort_order: row.sort_order,
    };
  });

  const { error: insertError } = await context.supabase.from("match_goals").insert(payload);
  if (insertError) {
    console.error("Goal insert failed", insertError.message);
    return { status: "error", message: "We couldn't save the goals." };
  }

  revalidatePath(`/admin/matches/${fixtureId}`);
  revalidatePath(`/match/${fixtureId}`);
  return { status: "success", message: `Saved ${payload.length} ${payload.length === 1 ? "goal" : "goals"}.` };
}

// =============================================================================
// Cards
// =============================================================================

export async function saveCards(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireFixtureEditor();
  const fixtureId = fixtureIdFrom(formData);

  const filled = rows(formData, "cardrow").filter((row) => row.player_name.length > 0);

  for (const row of filled) {
    const nameError = validatePlayerName(row.player_name);
    if (nameError) return { status: "error", message: nameError };

    const sideError = validateSide(row.side);
    if (sideError) return { status: "error", message: sideError };

    const cardError = validateCardType(row.card);
    if (cardError) return { status: "error", message: cardError };

    const minuteError = validateMinute(Number(row.minute));
    if (minuteError) return { status: "error", message: minuteError };
  }

  const players = await context.supabase.from("squad").select("id, full_name");
  const byName = new Map(
    (players.data ?? []).map((player) => [String(player.full_name).trim().toLowerCase(), player.id]),
  );

  const { error: deleteError } = await context.supabase
    .from("match_cards")
    .delete()
    .eq("fixture_id", fixtureId);
  if (deleteError) {
    console.error("Card clear failed", deleteError.message);
    return { status: "error", message: "We couldn't replace the cards. Try again." };
  }

  if (filled.length === 0) {
    revalidatePath(`/admin/matches/${fixtureId}`);
    revalidatePath(`/match/${fixtureId}`);
    return { status: "success", message: "All cards removed." };
  }

  const payload = filled.map((row) => ({
    fixture_id: fixtureId,
    player_id: byName.get(row.player_name.trim().toLowerCase()) ?? null,
    player_name: row.player_name.trim(),
    side: row.side as Side,
    card: row.card,
    minute: Number(row.minute),
    added_stoppage_minutes: row.added_stoppage,
    sort_order: row.sort_order,
  }));

  const { error: insertError } = await context.supabase.from("match_cards").insert(payload);
  if (insertError) {
    console.error("Card insert failed", insertError.message);
    return { status: "error", message: "We couldn't save the cards." };
  }

  revalidatePath(`/admin/matches/${fixtureId}`);
  revalidatePath(`/match/${fixtureId}`);
  return { status: "success", message: `Saved ${payload.length} ${payload.length === 1 ? "card" : "cards"}.` };
}

// =============================================================================
// Report
// =============================================================================

export async function saveReport(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireFixtureEditor();
  const fixtureId = fixtureIdFrom(formData);

  const body = String(formData.get("body") ?? "").trim();

  // An empty report means "remove it", which is a legitimate correction rather
  // than a deletion of history, so it is allowed and logged as such.
  if (body === "") {
    const { error } = await context.supabase.from("match_reports").delete().eq("fixture_id", fixtureId);
    if (error) {
      console.error("Report removal failed", error.message);
      return { status: "error", message: "We couldn't remove the report." };
    }
    revalidatePath(`/admin/matches/${fixtureId}`);
    revalidatePath(`/match/${fixtureId}`);
    return { status: "success", message: "Report removed." };
  }

  const error = validateReport(body);
  if (error) return { status: "error", message: error };

  // Upsert: one report per fixture, revised in place.
  const { error: upsertError } = await context.supabase
    .from("match_reports")
    .upsert({ fixture_id: fixtureId, body }, { onConflict: "fixture_id" });

  if (upsertError) {
    console.error("Report save failed", upsertError.message);
    return { status: "error", message: "We couldn't save the report." };
  }

  revalidatePath(`/admin/matches/${fixtureId}`);
  revalidatePath(`/match/${fixtureId}`);
  return { status: "success", message: "Match report saved." };
}
