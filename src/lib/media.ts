import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Image upload: types, buckets, paths and validation.
 *
 * Server-free by design. The picker component, the server action and the media
 * library all need the same bucket list and the same limits, and a client component
 * cannot import anything that reaches `next/headers`. Putting the shared parts here
 * keeps one source of truth without dragging a server-only module across the client
 * boundary.
 *
 * The bucket names and limits must match
 * supabase/migrations/20261005170000_media_and_reference_data.sql. Storage enforces
 * them again server-side, so a mismatch fails the upload rather than corrupting it.
 */

export const MEDIA_BUCKETS = ["sponsor-logos", "news", "players", "opponents"] as const;
export type MediaBucket = (typeof MEDIA_BUCKETS)[number];

/** Which form an upload came from. Drives both the bucket and the audit row. */
export type UploadPurpose = "sponsor" | "news" | "player" | "opponent";

export const PURPOSE_BUCKET: Record<UploadPurpose, MediaBucket> = {
  sponsor: "sponsor-logos",
  news: "news",
  player: "players",
  opponent: "opponents",
};

export const PURPOSE_LABEL: Record<UploadPurpose, string> = {
  sponsor: "Sponsor logo",
  news: "News image",
  player: "Player photo",
  opponent: "Opponent logo",
};

/**
 * Accepted image types.
 *
 * Matches allowed_mime_types in the migration. SVG is allowed only for sponsor and
 * opponent logos, because those are vector brand marks supplied as such; a
 * user-uploaded SVG on a news page would be an arbitrary script.
 */
const BASE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"] as const;

export function allowedTypes(purpose: UploadPurpose): string[] {
  return purpose === "sponsor" || purpose === "opponent"
    ? [...BASE_TYPES, "image/svg+xml"]
    : [...BASE_TYPES];
}

/** Byte limits, matching file_size_limit on each bucket. */
export const SIZE_LIMIT: Record<MediaBucket, number> = {
  "sponsor-logos": 2 * 1024 * 1024,
  news: 5 * 1024 * 1024,
  players: 4 * 1024 * 1024,
  opponents: 2 * 1024 * 1024,
};

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * File extension to use, keyed by the extension already in the filename.
 *
 * Keyed by extension, not by mime type: this is looked up from a filename, and the
 * browser's File.type is not consulted here. An earlier version keyed this by mime
 * type and so never matched, silently storing every upload as a .png regardless of
 * what it actually was - which browsers then refuse to render, because the bytes
 * are JPEG under a .png name.
 */
const EXTENSION: Record<string, string> = {
  png: "png",
  jpg: "jpg",
  jpeg: "jpg",
  webp: "webp",
  avif: "avif",
  svg: "svg",
};

/**
 * Builds the object path for an upload.
 *
 * Date-prefixed so the bucket listing groups by upload day rather than by upload
 * order across tasks, and slugified from the original filename so a person
 * browsing the bucket can tell what the file is.
 *
 * The random suffix is what makes two uploads of "logo.png" distinct. Without it
 * the second silently overwrites the first, which is the exact failure this design
 * is trying to avoid.
 */
export function objectPathFor(
  purpose: UploadPurpose,
  filename: string,
  now = new Date(),
  unique = Math.random().toString(36).slice(2, 10),
): string {
  // purpose is accepted but unused in the path itself: the path is relative to its
  // bucket, so the bucket name is not repeated inside it. Kept as a parameter
  // because callers pass the purpose and it documents the intent, and because the
  // extension table below is keyed by what the purpose allows.
  void purpose;

  // Lowercase before looking up the extension. A file named "Logo.JPG" would
  // otherwise miss the table and be stored as a .png, which browsers then refuse to
  // render correctly because the bytes are JPEG.
  const lower = filename.toLowerCase();
  const type = EXTENSION[lower.split(".").pop() ?? ""] ?? "png";

  const stem = filename
    .replace(/\.[^.]+$/, "")
    // Decompose FIRST, then strip the combining marks, then reduce to ASCII. Doing
    // the punctuation pass before deaccenting turns "Künye" into "k-nye", because
    // the combining diaeresis is not a letter and gets replaced by the separator.
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  const day = now.toISOString().slice(0, 10);
  return `${day}/${stem || "image"}-${unique}.${type}`;
}

/** The public URL for a stored object. */
export function publicUrlFor(bucket: MediaBucket, objectPath: string): string | null {
  const supabaseUrl = getSupabaseConfig()?.url;
  if (!supabaseUrl) return null;

  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${objectPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

// =============================================================================
// Validation
// =============================================================================

export type FileCheck = { ok: true } | { ok: false; message: string };

/**
 * Validates a file before upload.
 *
 * Type and size are checked here as well as in the bucket policy, because a clear
 * message in the form is worth more than a storage error code, and because the
 * browser can check both without a round trip.
 *
 * SVG is accepted as a type but flagged: an SVG can carry script, and a sponsor
 * supplying one should know it is being stored as-is. The public page renders it
 * through next/image, which does not execute scripts in an SVG referenced by src,
 * but a direct visit to the object URL would.
 */
export function checkFile(file: File, purpose: UploadPurpose): FileCheck {
  const bucket = PURPOSE_BUCKET[purpose];
  const allowed = allowedTypes(purpose);

  if (!allowed.includes(file.type)) {
    const readable = allowed
      .map((type) => type.replace("image/", "").replace("jpeg", "jpg").replace("+xml", ""))
      .join(", ");
    return { ok: false, message: `That file is a ${file.type || "unknown"} type. Use ${readable}.` };
  }

  const limit = SIZE_LIMIT[bucket];
  if (file.size > limit) {
    return {
      ok: false,
      message: `That image is ${humanSize(file.size)}. The limit for a ${PURPOSE_LABEL[purpose].toLowerCase()} is ${humanSize(limit)}.`,
    };
  }

  if (file.size === 0) {
    return { ok: false, message: "That file is empty." };
  }

  return { ok: true };
}

/** A short note shown next to the picker when an SVG is chosen. */
export function svgWarning(purpose: UploadPurpose): string | null {
  if (purpose !== "sponsor" && purpose !== "opponent") {
    return "SVG is not accepted here. Upload a PNG, which keeps the logo crisp at any size.";
  }
  return "SVG accepted. It is stored exactly as supplied, so ask the sponsor for a clean file.";
}
