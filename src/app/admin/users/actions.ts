"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/roles";
import { ROLES, type Role } from "@/lib/admin/roles";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { FixtureActionState } from "@/types/fixtures";

/**
 * Adding, removing and re-roling administrators.
 *
 * Super admin only, matching the policies in
 * supabase/migrations/20261005140000_role_guards.sql. The role check here gives a
 * clear message; RLS is what actually stops the write.
 *
 * Auth user management uses the Supabase Management API with the service_role
 * key (SUPABASE_SERVICE_ROLE_KEY in Vercel). Without it, admins must already
 * have a Supabase Auth account before being added.
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

// =============================================================================
// Supabase Management API
// =============================================================================

async function managementApi<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T | null> {
  const config = getSupabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !serviceKey) return null;

  const res = await fetch(`${config.url}/auth/v1/admin/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Management API ${method} ${path} failed`, res.status, text);
    return null;
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

/**
 * Create a Supabase Auth user.
 * Returns "created" | "exists" | null (error).
 */
async function createAuthUser(email: string): Promise<"created" | "exists" | null> {
  const result = await managementApi<{ id?: string }>(
    "POST",
    "users",
    { email, email_confirm: false },
  );

  if (result === null) {
    const existing = await managementApi<{ users?: { email: string }[] }>(
      "GET",
      `users?email=${encodeURIComponent(email)}`,
    );
    if (existing?.users?.length) return "exists";
    return null;
  }
  return "created";
}

/**
 * Delete a Supabase Auth user by email. Best effort.
 */
async function deleteAuthUser(email: string): Promise<void> {
  const existing = await managementApi<{ users?: { id: string; email: string }[] }>(
    "GET",
    `users?email=${encodeURIComponent(email)}`,
  );
  const userId = existing?.users?.[0]?.id;
  if (!userId) return;

  await managementApi("DELETE", `users/${userId}`);
}

// =============================================================================
// Actions
// =============================================================================

export async function addAdmin(
  _previous: FixtureActionState,
  formData: FormData,
): Promise<FixtureActionState> {
  try {
    const context = await requireSuperAdmin();

    const email = field(formData, "email").toLowerCase();
    const role = field(formData, "role");

    if (!EMAIL.test(email) || email.length > 254) {
      return { status: "error", message: "Enter a valid email address." };
    }
    if (!isRole(role)) {
      return { status: "error", message: "Choose a role." };
    }

    const authResult = await createAuthUser(email);
    if (authResult === null) {
      return {
        status: "error",
        message:
          "Could not create the sign-in account. Make sure SUPABASE_SERVICE_ROLE_KEY is set in Vercel.",
      };
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
    const authMessage =
      authResult === "created"
        ? " A confirmation email has been sent to them."
        : " They already had a sign-in account.";
    return {
      status: "success",
      message: `${email} added as ${role.replace("_", " ")}.${authMessage}`,
    };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not add administrator." };
  }
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
  try {
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

    await deleteAuthUser(email);

    revalidatePath("/admin/users");
    return {
      status: "success",
      message: `${email} removed. Their sign-in account has also been deleted.`,
    };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not remove administrator." };
  }
}
