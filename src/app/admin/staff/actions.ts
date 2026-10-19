"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/roles";
import { logAdminAction } from "@/lib/admin/audit";
import type { FixtureActionState } from "@/types/fixtures";

/**
 * Staff writes.
 *
 * Content admins and super admins, matching the staff policy in
 * 20261005180000_staff.sql.
 */

async function requireEditor() {
  const context = await getAdminContext();
  if (!context) throw new Error("Sign in to manage staff.");
  if (context.role !== "super_admin" && context.role !== "content") {
    throw new Error("Your role does not include staff editing.");
  }
  return context;
}

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function emptyToNull(value: string) {
  return value === "" ? null : value;
}

function readInput(formData: FormData) {
  return {
    full_name: field(formData, "full_name"),
    role: field(formData, "role"),
    bio: String(formData.get("bio") ?? ""),
    photo_url: emptyToNull(field(formData, "photo_url")),
    photo_url_alt: emptyToNull(field(formData, "photo_url_alt")),
    sort_order: field(formData, "sort_order"),
  };
}

function validate(full_name: string, role: string) {
  if (!full_name) return "Full name is required.";
  if (!role) return "Role is required.";
  return null;
}

export async function saveStaff(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  try {
    await requireEditor();
    const input = readInput(formData);
    const error = validate(input.full_name, input.role);
    if (error) return { status: "error", message: error };

    const context = await getAdminContext();
    if (!context) return { status: "error", message: "Session expired." };

    const { error: insertError } = await context.supabase.from("staff").insert({
      full_name: input.full_name,
      role: input.role,
      bio: input.bio || null,
      photo_url: input.photo_url,
      photo_url_alt: input.photo_url_alt,
      sort_order: input.sort_order === "" ? 0 : Number(input.sort_order),
      is_published: false,
    });

    if (insertError) {
      if (insertError.code === "42501") {
        return { status: "error", message: "Your role cannot add staff." };
      }
      console.error("Staff insert failed", insertError.message);
      return { status: "error", message: "Could not add staff member." };
    }

    // Log the admin action
    await logAdminAction({
      actor_email: context.user.email,
      actor_role: context.role,
      target_type: "staff",
      target_id: input.full_name,
      action: "Added staff member",
      details: { full_name: input.full_name, role: input.role },
    });

    revalidatePath("/admin/staff");
    revalidatePath("/team/staff");
    return { status: "success", message: "Staff member added." };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not add staff member." };
  }
}

export async function updateStaff(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  try {
    await requireEditor();
    const id = field(formData, "id");
    if (!id) return { status: "error", message: "Missing staff ID." };

    const input = readInput(formData);
    const error = validate(input.full_name, input.role);
    if (error) return { status: "error", message: error };

    const context = await getAdminContext();
    if (!context) return { status: "error", message: "Session expired." };

    const { error: updateError } = await context.supabase
      .from("staff")
      .update({
        full_name: input.full_name,
        role: input.role,
        bio: input.bio || null,
        photo_url: input.photo_url,
        photo_url_alt: input.photo_url_alt,
        sort_order: input.sort_order === "" ? 0 : Number(input.sort_order),
      })
      .eq("id", id);

    if (updateError) {
      if (updateError.code === "42501") {
        return { status: "error", message: "Your role cannot edit staff." };
      }
      console.error("Staff update failed", updateError.message);
      return { status: "error", message: "Could not save changes." };
    }

    // Log the admin action
    await logAdminAction({
      actor_email: context.user.email,
      actor_role: context.role,
      target_type: "staff",
      target_id: id,
      action: "Updated staff member",
      details: { full_name: input.full_name, role: input.role },
    });

    revalidatePath("/admin/staff");
    revalidatePath("/team/staff");
    return { status: "success", message: "Changes saved." };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not save changes." };
  }
}

export async function toggleStaffPublished(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  try {
    await requireEditor();
    const id = field(formData, "id");
    const publish = field(formData, "publish") === "true";
    if (!id) return { status: "error", message: "Missing staff ID." };

    const context = await getAdminContext();
    if (!context) return { status: "error", message: "Session expired." };

    const { error } = await context.supabase
      .from("staff")
      .update({ is_published: publish })
      .eq("id", id);

    if (error) {
      console.error("Staff toggle failed", error.message);
      return { status: "error", message: "Could not change visibility." };
    }

    // Log the admin action
    await logAdminAction({
      actor_email: context.user.email,
      actor_role: context.role,
      target_type: "staff",
      target_id: id,
      action: publish ? "Published staff member" : "Unpublished staff member",
      details: {},
    });

    revalidatePath("/admin/staff");
    revalidatePath("/team/staff");
    return { status: "success", message: publish ? "Published." : "Unpublished." };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not change visibility." };
  }
}

export async function removeStaff(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  try {
    await requireEditor();
    const id = field(formData, "id");
    if (!id) return { status: "error", message: "Missing staff ID." };

    const context = await getAdminContext();
    if (!context) return { status: "error", message: "Session expired." };

    const { error } = await context.supabase.from("staff").delete().eq("id", id);

    if (error) {
      console.error("Staff delete failed", error.message);
      return { status: "error", message: "Could not remove staff member." };
    }

    // Log the admin action
    await logAdminAction({
      actor_email: context.user.email,
      actor_role: context.role,
      target_type: "staff",
      target_id: id,
      action: "Removed staff member",
      details: {},
    });

    revalidatePath("/admin/staff");
    revalidatePath("/team/staff");
    return { status: "success", message: "Staff member removed." };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not remove staff member." };
  }
}
