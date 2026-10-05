"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext, type Role } from "@/lib/admin/roles";
import { createClient } from "@/lib/supabase/server";
import {
  PURPOSE_BUCKET,
  objectPathFor,
  publicUrlFor,
  checkFile,
  type UploadPurpose,
} from "@/lib/media";

/**
 * Image upload.
 *
 * One action serves every photo field, because the validation, the audit row and
 * the error messages are identical and a per-form copy would drift.
 *
 * The role check here gives a readable message; the storage policies in
 * 20261005170000_media_and_reference_data.sql are the actual boundary. Both are
 * needed: the policy prevents the write, and the check prevents a confusing
 * permission-denied message in the UI.
 */

export type UploadState = {
  status: "idle" | "success" | "error";
  message: string;
  url: string;
  path: string;
};

/**
 * Which roles may upload for which purpose.
 *
 * Mirrors the storage policies. Sponsorship is a commercial relationship rather
 * than editorial content, so sponsor logos stay with the super admin while news and
 * player photos sit with the content editors.
 */
const UPLOAD_ROLES: Record<UploadPurpose, Role[]> = {
  sponsor: ["super_admin"],
  news: ["content", "super_admin"],
  player: ["content", "fixtures", "super_admin"],
  opponent: ["fixtures", "super_admin"],
};

const PURPOSES: UploadPurpose[] = ["sponsor", "news", "player", "opponent"];

function isPurpose(value: unknown): value is UploadPurpose {
  return typeof value === "string" && (PURPOSES as string[]).includes(value);
}

export async function uploadImage(
  _previous: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const context = await getAdminContext();
  if (!context) {
    return { status: "error", message: "Sign in to upload an image.", url: "", path: "" };
  }

  const purposeRaw = String(formData.get("purpose") ?? "");
  if (!isPurpose(purposeRaw)) {
    return { status: "error", message: "Unknown upload target.", url: "", path: "" };
  }
  const purpose = purposeRaw;

  if (!UPLOAD_ROLES[purpose].includes(context.role)) {
    return {
      status: "error",
      message: `Your role cannot upload ${purpose} images.`,
      url: "",
      path: "",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose an image to upload.", url: "", path: "" };
  }

  const check = checkFile(file, purpose);
  if (!check.ok) {
    return { status: "error", message: check.message, url: "", path: "" };
  }

  const bucket = PURPOSE_BUCKET[purpose];
  const objectPath = objectPathFor(purpose, file.name);

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file, {
      // Explicit content type: Supabase infers from the Blob, and a File from a
      // form post is not always typed correctly on every browser.
      contentType: file.type,
      // Never upsert. A collision should fail loudly rather than overwrite an image
      // a published page is already using.
      upsert: false,
    });

  if (uploadError) {
    console.error("Upload failed", uploadError.message);
    // Storage enforces the same limits; this is the message when the file slipped
    // past the browser check, for example because the browser reported no type.
    if (/mime|content type/i.test(uploadError.message)) {
      return { status: "error", message: "That file type is not accepted here.", url: "", path: "" };
    }
    if (/exceeded|size|too large/i.test(uploadError.message)) {
      return { status: "error", message: "That image is too large for this bucket.", url: "", path: "" };
    }
    return { status: "error", message: "The upload failed. Try again.", url: "", path: "" };
  }

  const publicUrl = publicUrlFor(bucket, objectPath);
  if (!publicUrl) {
    return {
      status: "error",
      message: "The image uploaded, but Supabase is not configured so no public URL can be built.",
      url: "",
      path: objectPath,
    };
  }

  // Audit row. uploaded_by comes from the session, never the form, so an admin
  // cannot attribute an upload to someone else. There is no insert policy on
  // media_uploads, which is why this works at all.
  const { error: logError } = await context.supabase.from("media_uploads").insert({
    bucket,
    object_path: objectPath,
    public_url: publicUrl,
    purpose,
    original_filename: file.name.slice(0, 255),
    uploaded_by: context.user.email,
  });

  if (logError) {
    // The file is already stored. Say so rather than pretending it failed, or the
    // contributor uploads it again and the second attempt collides.
    console.error("Upload log insert failed", logError.message);
    return {
      status: "success",
      message: `Uploaded, but the audit entry failed, so this upload is not recorded. ${publicUrl}`,
      url: publicUrl,
      path: objectPath,
    };
  }

  revalidatePath("/admin/media");
  revalidatePath("/admin/news");
  revalidatePath("/admin/squad");
  revalidatePath("/admin/fixtures");
  revalidatePath("/admin/sponsors");

  return { status: "success", message: "Image uploaded.", url: publicUrl, path: objectPath };
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

  if (!/^(sponsor-logos|news|players|opponents)$/.test(bucketRaw)) {
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