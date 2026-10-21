"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/roles";
import { validateSquad } from "@/lib/matches/validation";
import { logAdminAction } from "@/lib/admin/audit";
import { conflictMessage, readExpectedUpdatedAt, staleFormMessage, updateWasRejected } from "@/lib/admin/concurrency";
import type { FixtureActionState } from "@/types/fixtures";

/**
 * Squad writes.
 *
 * Fixture editors and super admins, matching the squad policy in
 * 20261005150000_match_content.sql.
 *
 * date_of_birth is handled as confidential throughout: it is validated here,
 * written here, and never sent to the public pages. is_minor is maintained by a
 * database trigger rather than computed here, so the flag cannot be forged from
 * the client.
 */

async function requireEditor() {
  const context = await getAdminContext();
  if (!context) throw new Error("Sign in to manage the squad.");
  if (context.role !== "super_admin" && context.role !== "fixtures") {
    throw new Error("Your role does not include squad editing.");
  }
  return context;
}

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function emptyToNull(value: string) {
  return value === "" ? null : value;
}

function toNumber(value: string) {
  return value === "" ? null : Number(value);
}

function readInput(formData: FormData) {
  return {
    full_name: field(formData, "full_name"),
    date_of_birth: field(formData, "date_of_birth"),
    position: field(formData, "position"),
    preferred_foot: field(formData, "preferred_foot"),
    height_cm: field(formData, "height_cm"),
    weight_kg: field(formData, "weight_kg"),
    shirt_number: field(formData, "shirt_number"),
    bio: String(formData.get("bio") ?? ""),
    photo_url: field(formData, "photo_url"),
    photo_url_alt: field(formData, "photo_url_alt"),
  };
}

export async function savePlayer(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireEditor();
  const input = readInput(formData);

  const error = validateSquad(input);
  if (error) return { status: "error", message: error };

  const { error: writeError } = await context.supabase.from("squad").insert({
    full_name: input.full_name,
    date_of_birth: emptyToNull(input.date_of_birth),
    position: emptyToNull(input.position),
    preferred_foot: emptyToNull(input.preferred_foot),
    height_cm: toNumber(input.height_cm),
    weight_kg: toNumber(input.weight_kg),
    shirt_number: toNumber(input.shirt_number),
    bio: emptyToNull(input.bio),
    photo_url: emptyToNull(input.photo_url),
    photo_url_alt: emptyToNull(input.photo_url_alt),
    is_published: false,
  });

  if (writeError) {
    console.error("Squad insert failed", writeError.message);
    return { status: "error", message: "We couldn't add that player." };
  }

  // Log the admin action
  await logAdminAction({
    actor_email: context.user.email,
    actor_role: context.role,
    target_type: "squad",
    target_id: input.full_name,
    action: "Added player",
    details: { full_name: input.full_name, position: input.position, shirt_number: input.shirt_number },
  });

  revalidatePath("/admin/squad");
  return {
    status: "success",
    message: `${input.full_name} added. Unpublished until you publish them.`,
  };
}

export async function updatePlayer(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireEditor();
  const id = field(formData, "id");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: "error", message: "Unknown player." };

  const input = readInput(formData);
  const error = validateSquad(input);
  if (error) return { status: "error", message: error };

  // Only overwrite the version the form was rendered with; updated_at is
  // maintained by the squad_set_updated_at trigger.
  const expectedUpdatedAt = readExpectedUpdatedAt(formData);
  if (!expectedUpdatedAt) return { status: "error", message: staleFormMessage("player") };

  const { data: written, error: writeError } = await context.supabase
    .from("squad")
    .update({
      full_name: input.full_name,
      date_of_birth: emptyToNull(input.date_of_birth),
      position: emptyToNull(input.position),
      preferred_foot: emptyToNull(input.preferred_foot),
      height_cm: toNumber(input.height_cm),
      weight_kg: toNumber(input.weight_kg),
      shirt_number: toNumber(input.shirt_number),
      bio: emptyToNull(input.bio),
      photo_url: emptyToNull(input.photo_url),
      photo_url_alt: emptyToNull(input.photo_url_alt),
    })
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .select("id");

  if (writeError) {
    console.error("Squad update failed", writeError.message);
    return { status: "error", message: "We couldn't update that player." };
  }
  if (updateWasRejected(written)) return { status: "error", message: conflictMessage("player") };

  // Log the admin action
  await logAdminAction({
    actor_email: context.user.email,
    actor_role: context.role,
    target_type: "squad",
    target_id: id,
    action: "Updated player",
    details: { full_name: input.full_name, position: input.position, shirt_number: input.shirt_number },
  });

  revalidatePath("/admin/squad");
  return { status: "success", message: `${input.full_name} updated.` };
}

export async function togglePlayerPublished(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireEditor();
  const id = field(formData, "id");
  const publish = field(formData, "publish") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: "error", message: "Unknown player." };

  const { error } = await context.supabase
    .from("squad")
    .update({ is_published: publish })
    .eq("id", id);

  if (error) {
    console.error("Squad publish toggle failed", error.message);
    return { status: "error", message: "We couldn't change that player's visibility." };
  }

  // Log the admin action
  await logAdminAction({
    actor_email: context.user.email,
    actor_role: context.role,
    target_type: "squad",
    target_id: id,
    action: publish ? "Published player" : "Unpublished player",
    details: {},
  });

  revalidatePath("/admin/squad");
  return { status: "success", message: publish ? "Player published." : "Player unpublished." };
}

/**
 * Removing a player.
 *
 * Lineups and goals keep player_name, so removing a squad record does not damage
 * a recorded match: the name stays on the lineup row and player_id becomes null.
 * That is why this is a hard delete rather than an unpublish, and it is why the
 * UI says what happens.
 */
export async function removePlayer(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireEditor();
  const id = field(formData, "id");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: "error", message: "Unknown player." };

  const { data: player } = await context.supabase
    .from("squad")
    .select("full_name")
    .eq("id", id)
    .maybeSingle();

  const { error } = await context.supabase.from("squad").delete().eq("id", id);
  if (error) {
    console.error("Squad delete failed", error.message);
    return { status: "error", message: "We couldn't remove that player." };
  }

  // Log the admin action
  await logAdminAction({
    actor_email: context.user.email,
    actor_role: context.role,
    target_type: "squad",
    target_id: id,
    action: "Removed player",
    details: { full_name: player?.full_name ?? "unknown" },
  });

  revalidatePath("/admin/squad");
  return {
    status: "success",
    message: `${player?.full_name ?? "Player"} removed from the squad list. Past match records keep their name.`,
  };
}
