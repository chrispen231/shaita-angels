"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  PURPOSE_BUCKET,
  checkFile,
  objectPathFor,
  publicUrlFor,
  type UploadPurpose,
} from "@/lib/media";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type UploadResult = {
  status: "success" | "error";
  message: string;
  url: string;
  path: string;
};

/** Uploads the image directly from the browser, so it never crosses the 1 MB
 * Next.js Server Action request limit. Storage RLS remains the permission boundary. */
export async function uploadMediaFile(file: File, purpose: UploadPurpose): Promise<UploadResult> {
  const check = checkFile(file, purpose);
  if (!check.ok) return { status: "error", message: check.message, url: "", path: "" };

  const config = getSupabaseConfig();
  if (!config) {
    return { status: "error", message: "Supabase is not configured for image uploads.", url: "", path: "" };
  }

  const supabase = createBrowserClient(config.url, config.publishableKey);
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user?.email) {
    return { status: "error", message: "Sign in to upload an image.", url: "", path: "" };
  }

  const bucket = PURPOSE_BUCKET[purpose];
  const objectPath = objectPathFor(purpose, file.name);
  const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    const message = uploadError.message;
    if (/mime|content type/i.test(message)) {
      return { status: "error", message: "That file type is not accepted here.", url: "", path: "" };
    }
    if (/exceeded|size|too large/i.test(message)) {
      return { status: "error", message: "That image is too large for this bucket.", url: "", path: "" };
    }
    if (/row-level security|permission|unauthorized|403/i.test(message)) {
      return { status: "error", message: "Your admin role cannot upload to this image category.", url: "", path: "" };
    }
    console.error("Direct image upload failed", message);
    return { status: "error", message: "The upload failed. Check your connection and try again.", url: "", path: "" };
  }

  const url = publicUrlFor(bucket, objectPath);
  if (!url) {
    return { status: "error", message: "The image uploaded, but its public URL could not be created.", url: "", path: objectPath };
  }

  const { error: logError } = await supabase.from("media_uploads").insert({
    bucket,
    object_path: objectPath,
    public_url: url,
    purpose,
    original_filename: file.name.slice(0, 255),
    uploaded_by: authData.user.email,
  });

  if (logError) {
    console.error("Upload log insert failed", logError.message);
    return {
      status: "success",
      message: "Image uploaded, but its media-library record could not be saved. Contact an administrator.",
      url,
      path: objectPath,
    };
  }

  return { status: "success", message: "Image uploaded.", url, path: objectPath };
}
