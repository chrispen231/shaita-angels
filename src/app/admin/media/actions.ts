"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/roles";
import { createClient } from "@/lib/supabase/server";

export type UploadState = {
  status: "idle" | "success" | "error";
  message: string;
  url: string;
  path: string;
};

/**
 * Toggles the published state of a gallery photo.
 *
 * Only super admins can publish or unpublish gallery photos, matching the
 * RLS policy "Super admins can publish gallery photos" in
 * 20261016130000_gallery.sql.
 */
export async function togglePublish(
  _previous: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const context = await getAdminContext();
  if (!context) {
    return { status: "error", message: "Sign in to change publish state.", url: "", path: "" };
  }
  if (context.role !== "super_admin") {
    return { status: "error", message: "Only a super admin can publish or unpublish gallery photos.", url: "", path: "" };
  }

  const id = String(formData.get("id") ?? "").trim();
  const publish = formData.get("publish") === "true";

  if (!id) {
    return { status: "error", message: "Unknown photo.", url: "", path: "" };
  }

  // `.select()` makes PostgREST return the affected rows. Without it a blocked
  // UPDATE returns no error and zero rows, so the UI would claim success while
  // nothing changed -- which is exactly how the broken RLS policy hid itself.
  const { data, error } = await context.supabase
    .from("media_uploads")
    .update({ is_published: publish })
    .eq("id", id)
    .eq("purpose", "gallery")
    .select("id");

  if (error) {
    console.error("Publish toggle failed", error.message);
    return { status: "error", message: "We couldn't change the publish state.", url: "", path: "" };
  }

  if (!data || data.length === 0) {
    console.error("Publish toggle matched no rows", id);
    return {
      status: "error",
      message: "That photo wasn't updated. You may not have permission to publish it.",
      url: "",
      path: "",
    };
  }

  revalidatePath("/admin/media");
  revalidatePath("/media");
  return {
    status: "success",
    message: publish ? "Photo published." : "Photo unpublished.",
    url: "",
    path: "",
  };
}

/**
 * Deletes a stored image.
 *
 * Super admin only, matching the single delete policy. The audit row is kept: the
 * record that an image existed and who put it there is more useful than the image,
 * and the log is what makes "who removed the sponsor logo" answerable in Phase 5.
 */
export async function deleteImage(
  _previous: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const context = await getAdminContext();
  if (!context) {
    return { status: "error", message: "Sign in to delete an image.", url: "", path: "" };
  }
  if (context.role !== "super_admin") {
    return { status: "error", message: "Only a super admin can delete an image.", url: "", path: "" };
  }

  const bucketRaw = String(formData.get("bucket") ?? "");
  const objectPath = String(formData.get("path") ?? "").trim();

  if (!/^(sponsor-logos|news|players|opponents|gallery|leadership)$/.test(bucketRaw)) {
    return { status: "error", message: "Unknown image bucket.", url: "", path: "" };
  }
  // A path from the browser must not be able to escape its bucket or address an
  // object outside the prefix the upload action writes.
  if (!objectPath || objectPath.includes("..") || objectPath.startsWith("/")) {
    return { status: "error", message: "Unknown image.", url: "", path: "" };
  }

  const supabase = await createClient();
  const { error } = await supabase.storage.from(bucketRaw).remove([objectPath]);

  if (error) {
    console.error("Image delete failed", error.message);
    return { status: "error", message: "We couldn't delete that image.", url: "", path: "" };
  }

  revalidatePath("/admin/media");
  return { status: "success", message: "Image deleted. Records still pointing at it will show a gap.", url: "", path: "" };
}
