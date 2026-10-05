"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/roles";
import { ROLES, type Role } from "@/lib/admin/roles";
import type { FixtureActionState } from "@/types/fixtures";

/**
 * Adding, removing and re-roling administrators.
 *
 * Super admin only, matching the policies in
 * supabase/migrations/20261005140000_role_guards.sql. The role check here gives a
 * clear message; RLS is what actually stops the write.
 *
 * Two hazards this file deliberately does not try to handle:
 *
 *   * An admin can only be added once they exist as a Supabase Auth user. Adding
 *     a row for an email with no auth account creates an admin who can never sign
 *     in and can never be removed through this screen without confusion. The form
 *     asks for the email only and the README explains the two-step order.
 *
 *   * Removing the last super admin is refused by a database trigger, not here.
 *     The check in the database is the one that counts, because it also covers
 *     direct SQL and the Supabase dashboard.
 */

async function requireSuperAdmin() {
  const context = await getAdminContext();
  if (!context) throw new Error("Sign in to manage administrators.");
  if (context.role !== "super_admin") {
    throw new Error("Only a super admin can manage administrators.");
  }
  return context;
}

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export async function addAdmin(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireSuperAdmin();

  const email = field(formData, "email").toLowerCase();
  const role = field(formData, "role");

  if (!EMAIL.test(email) || email.length > 254) {
    return { status: "error", message: "Enter a valid email address." };
  }
  if (!isRole(role)) {
    return { status: "error", message: "Choose a role." };
  }

  const { error } = await context.supabase.from("site_admins").insert({ email, role });
  if (error) {
    if (error.code === "23505") {
      return { status: "error", message: "That email is already an administrator." };
    }
    console.error("Admin insert failed", error.message);
    return { status: "error", message: "We couldn't add that administrator." };
  }

  revalidatePath("/admin/users");
  return { status: "success", message: `${email} added as ${role.replace("_", " ")}.` };
}

export async function changeAdminRole(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireSuperAdmin();

  const email = field(formData, "email").toLowerCase();
  const role = field(formData, "role");

  if (!email || !isRole(role)) {
    return { status: "error", message: "Choose a role for that administrator." };
  }

  const { error } = await context.supabase.from("site_admins").update({ role }).eq("email", email);
  if (error) {
    // The trigger raises 42501 when this would remove the last super admin.
    if (error.code === "42501") {
      return {
        status: "error",
        message: "That change would leave the site with no super admin. Promote someone else first.",
      };
    }
    console.error("Admin role change failed", error.message);
    return { status: "error", message: "We couldn't change that role." };
  }

  revalidatePath("/admin/users");
  return { status: "success", message: `${email} is now ${role.replace("_", " ")}.` };
}

export async function removeAdmin(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  const context = await requireSuperAdmin();

  const email = field(formData, "email").toLowerCase();
  if (!email) return { status: "error", message: "Missing administrator." };

  if (email === context.user.email.toLowerCase()) {
    return {
      status: "error",
      message: "You cannot remove your own account while signed in.",
    };
  }

  const { error } = await context.supabase.from("site_admins").delete().eq("email", email);
  if (error) {
    if (error.code === "42501") {
      return {
        status: "error",
        message: "That would leave the site with no super admin.",
      };
    }
    console.error("Admin delete failed", error.message);
    return { status: "error", message: "We couldn't remove that administrator." };
  }

  revalidatePath("/admin/users");
  return { status: "success", message: `${email} removed.` };
}
