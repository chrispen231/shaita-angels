"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/roles";
import { validateLeadership, type LeadershipInput } from "@/lib/leadership-validation";
import type { FixtureActionState } from "@/types/fixtures";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function editor() {
  const context = await getAdminContext();
  if (!context) throw new Error("Sign in to manage leadership.");
  if (context.role !== "super_admin" && context.role !== "content") {
    throw new Error("Your role does not include leadership editing.");
  }
  return context;
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readInput(formData: FormData): LeadershipInput {
  const bio = String(formData.get("bio") ?? "").trim();
  const photo = value(formData, "photo_url");
  const photoAlt = value(formData, "photo_alt");
  const sort = value(formData, "sort_order");
  return {
    full_name: value(formData, "full_name"),
    role: value(formData, "role"),
    bio: bio || null,
    photo_url: photo || null,
    photo_alt: photoAlt || null,
    sort_order: sort === "" ? 0 : Number(sort),
  };
}

function errorState(error: unknown, fallback: string): FixtureActionState {
  return { status: "error", message: error instanceof Error ? error.message : fallback };
}

function refresh() {
  revalidatePath("/admin/leadership");
  revalidatePath("/team/leadership");
  revalidatePath("/media");
}

export async function addLeader(_previous: FixtureActionState, formData: FormData): Promise<FixtureActionState> {
  try {
    const context = await editor();
    const input = readInput(formData);
    const invalid = validateLeadership(input);
    if (invalid) return { status: "error", message: invalid };

    const { error } = await context.supabase.from("leadership").insert({ ...input, is_published: false });
    if (error) {
      console.error("Leadership insert failed", error.message);
      return { status: "error", message: "Could not add this leadership profile. Check that the leadership database migration has been applied." };
    }
    refresh();
    return { status: "success", message: "Leadership profile added as an unpublished draft." };
  } catch (error) {
    return errorState(error, "Could not add this leadership profile.");
  }
}

export async function updateLeader(_previous: FixtureActionState, formData: FormData): Promise<FixtureActionState> {
  try {
    const context = await editor();
    const id = value(formData, "id");
    if (!UUID.test(id)) return { status: "error", message: "Invalid leadership profile ID." };
    const input = readInput(formData);
    const invalid = validateLeadership(input);
    if (invalid) return { status: "error", message: invalid };

    const { data, error } = await context.supabase.from("leadership").update(input).eq("id", id).select("id");
    if (error || !data?.length) {
      if (error) console.error("Leadership update failed", error.message);
      return { status: "error", message: "Could not save changes. Check the profile still exists and the migration is applied." };
    }
    refresh();
    return { status: "success", message: "Leadership profile updated." };
  } catch (error) {
    return errorState(error, "Could not save changes.");
  }
}

export async function setLeaderPublished(_previous: FixtureActionState, formData: FormData): Promise<FixtureActionState> {
  try {
    const context = await editor();
    const id = value(formData, "id");
    if (!UUID.test(id)) return { status: "error", message: "Invalid leadership profile ID." };
    const publish = value(formData, "publish") === "true";
    const { data, error } = await context.supabase.from("leadership").update({ is_published: publish }).eq("id", id).select("id");
    if (error || !data?.length) {
      if (error) console.error("Leadership visibility update failed", error.message);
      return { status: "error", message: "Could not change this profile's visibility." };
    }
    refresh();
    return { status: "success", message: publish ? "Leadership profile published." : "Leadership profile unpublished." };
  } catch (error) {
    return errorState(error, "Could not change visibility.");
  }
}

export async function removeLeader(_previous: FixtureActionState, formData: FormData): Promise<FixtureActionState> {
  try {
    const context = await editor();
    const id = value(formData, "id");
    if (!UUID.test(id)) return { status: "error", message: "Invalid leadership profile ID." };
    const { data, error } = await context.supabase.from("leadership").delete().eq("id", id).select("id");
    if (error || !data?.length) {
      if (error) console.error("Leadership delete failed", error.message);
      return { status: "error", message: "Could not remove this leadership profile." };
    }
    refresh();
    return { status: "success", message: "Leadership profile removed." };
  } catch (error) {
    return errorState(error, "Could not remove this leadership profile.");
  }
}
