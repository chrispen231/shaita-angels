"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/roles";
import { conflictMessage, readExpectedUpdatedAt, staleFormMessage, updateWasRejected } from "@/lib/admin/concurrency";
import type { FixtureActionState } from "@/types/fixtures";

/**
 * Sponsor and site-settings writes.
 *
 * Every action re-checks the admin context, and the sponsors actions additionally
 * require the super_admin role, matching the RLS policies in
 * supabase/migrations/20261005130000_admin_roles.sql. The role check here is for
 * a clear error message; RLS is what actually stops the write.
 */

async function requireSuperAdmin() {
  const context = await getAdminContext();
  if (!context) redirect("/admin/login");
  if (context.role !== "super_admin") {
    throw new Error("Only a super admin can manage sponsors.");
  }
  return context;
}

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const URL_PATTERN = /^https?:\/\//i;

export async function saveSponsor(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireSuperAdmin();

  const id = field(formData, "id");
  const name = field(formData, "name");
  const url = field(formData, "url");
  const altText = field(formData, "alt_text");
  const logoPath = field(formData, "logo_path");
  const startsOn = field(formData, "starts_on");
  const endsOn = field(formData, "ends_on");
  const tier = Number(field(formData, "tier"));
  const sortOrder = Number(field(formData, "sort_order") || "0");
  const published = formData.get("is_published") === "on";

  if (!name || name.length > 120) {
    return { status: "error", message: "Enter a sponsor name of 1 to 120 characters." };
  }
  if (url && !URL_PATTERN.test(url)) {
    return { status: "error", message: "The website must start with http:// or https://." };
  }
  if (altText && altText.length > 200) {
    return { status: "error", message: "Alt text is limited to 200 characters." };
  }
  if (![1, 2, 3].includes(tier)) {
    return { status: "error", message: "Choose a tier: 1 principal, 2 partner or 3 supplier." };
  }
  if (startsOn && !/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) {
    return { status: "error", message: "Enter a valid start date." };
  }
  if (endsOn && !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) {
    return { status: "error", message: "Enter a valid end date." };
  }
  if (startsOn && endsOn && endsOn < startsOn) {
    return { status: "error", message: "The contract end date cannot be before the start date." };
  }
  if (!Number.isFinite(sortOrder)) {
    return { status: "error", message: "Sort order must be a number." };
  }

  const values = {
    name,
    tier,
    url: url || null,
    alt_text: altText || null,
    logo_path: logoPath || null,
    starts_on: startsOn || null,
    ends_on: endsOn || null,
    sort_order: sortOrder,
    is_published: published,
    updated_at: new Date().toISOString(),
  };

  // Edits only land on the version the form was rendered with, so a second
  // super admin's save is reported rather than overwritten.
  const expectedUpdatedAt = readExpectedUpdatedAt(formData);
  if (id && !expectedUpdatedAt) return { status: "error", message: staleFormMessage("sponsor") };

  const { data: written, error } = id
    ? await context.supabase
      .from("sponsors")
      .update(values)
      .eq("id", id)
      .eq("updated_at", expectedUpdatedAt!)
      .select("id")
    : await context.supabase.from("sponsors").insert({ ...values, created_at: new Date().toISOString() });

    if (error) {
      console.error("Sponsor save failed", error.message);
      return {
        status: "error",
        message: "We couldn't save that sponsor. Check the details and try again.",
      };
    }
    if (id && updateWasRejected(written)) return { status: "error", message: conflictMessage("sponsor") };

    revalidatePath("/admin/sponsors");
    revalidatePath("/", "layout");
    return { status: "success", message: id ? "Sponsor updated." : "Sponsor added." };
}

export async function setSponsorPublished(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireSuperAdmin();

  const id = field(formData, "id");
  const published = formData.get("is_published") === "on";
  if (!id) return { status: "error", message: "Missing sponsor." };

  const { data: written, error } = await context.supabase
      .from("sponsors")
      .update({ is_published: published, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("Sponsor publish toggle failed", error.message);
      return { status: "error", message: "We couldn't update that sponsor." };
    }
    if (updateWasRejected(written)) return { status: "error", message: "That sponsor no longer exists or you can't change it. Reload the page." };

    revalidatePath("/admin/sponsors");
    revalidatePath("/", "layout");
    return { status: "success", message: published ? "Sponsor published." : "Sponsor unpublished." };
}

/**
 * Removing a sponsor deletes its row. The confirmation is the admin's
 * responsibility, and this is the one write in the admin section that destroys
 * data, so it is kept in its own action rather than folded into saveSponsor.
 */
export async function deleteSponsor(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireSuperAdmin();

  const id = field(formData, "id");
  const confirmName = field(formData, "confirm_name");
  if (!id) return { status: "error", message: "Missing sponsor." };

  const { data: sponsor } = await context.supabase
    .from("sponsors")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (!sponsor) return { status: "error", message: "That sponsor no longer exists." };

  // Typing the name is the confirmation. It is deliberately more than a dialog:
  // a dialog can be dismissed by reflex, a typed name cannot.
  if (confirmName !== sponsor.name) {
    return {
      status: "error",
      message: "Type the sponsor name exactly to confirm removal.",
    };
  }

  const { data: deleted, error } = await context.supabase.from("sponsors").delete().eq("id", id).select("id");
    if (error) {
      console.error("Sponsor delete failed", error.message);
      return { status: "error", message: "We couldn't remove that sponsor." };
    }
    if (updateWasRejected(deleted)) return { status: "error", message: "That sponsor no longer exists or you can't change it. Reload the page." };

    revalidatePath("/admin/sponsors");
    revalidatePath("/", "layout");
    return { status: "success", message: `${sponsor.name} removed.` };
}

export async function saveSettings(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireSuperAdmin();

  const contactEmail = field(formData, "contact_email");
  const phoneOrders = field(formData, "phone_orders");
  const socialRaw = field(formData, "social_handles");

  if (contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
    return { status: "error", message: "Enter a valid contact email address." };
  }
  if (phoneOrders && phoneOrders.length > 60) {
    return { status: "error", message: "The order phone number is limited to 60 characters." };
  }

  let handles: unknown[] = [];
  try {
    const parsed = JSON.parse(socialRaw || "[]");
    if (!Array.isArray(parsed)) throw new Error("not an array");
    handles = parsed.filter(
      (entry): entry is { platform: string; url: string; label: string; is_published: boolean } =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as { platform?: unknown }).platform === "string" &&
        typeof (entry as { url?: unknown }).url === "string" &&
        URL_PATTERN.test((entry as { url: string }).url),
    );
  } catch {
    return { status: "error", message: "The social links could not be read. Check the format." };
  }

  const values = {
    social_handles: handles,
    contact_email: contactEmail || null,
    phone_orders: phoneOrders || null,
    updated_at: new Date().toISOString(),
  };

  // The singleton row is seeded by the migration, so this is normally an update
  // conditional on the version the form saw. The insert only covers a database
  // where the seed row is missing; its primary key rejects a concurrent second one.
  const expectedUpdatedAt = readExpectedUpdatedAt(formData);
  const { data: written, error } = expectedUpdatedAt
    ? await context.supabase
      .from("site_settings")
      .update(values)
      .eq("id", true)
      .eq("updated_at", expectedUpdatedAt)
      .select("id")
    : await context.supabase.from("site_settings").insert({ id: true, ...values }).select("id");

    if (error?.code === "23505" || (!error && updateWasRejected(written))) {
      return { status: "error", message: conflictMessage("settings page") };
    }
    if (error) {
      console.error("Site settings save failed", error.message);
      return { status: "error", message: "We couldn't save the settings." };
    }

    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    return { status: "success", message: "Settings saved." };
}