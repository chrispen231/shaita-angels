"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { deleteImage, togglePublish, uploadImage, type UploadState } from "./actions";
import { PURPOSE_LABEL, type UploadPurpose } from "@/lib/media";
import styles from "./page.module.css";

const initial: UploadState = { status: "idle", message: "", url: "", path: "" };

export type MediaRow = {
  id: string;
  bucket: string;
  object_path: string;
  public_url: string;
  purpose: string;
  original_filename: string | null;
  uploaded_by: string;
  uploaded_at: string;
  is_published: boolean;
};

const PURPOSES: UploadPurpose[] = ["sponsor", "news", "player", "opponent", "gallery"];

/**
 * Browses what has been uploaded, newest first.
 *
 * Copy-URL rather than a picker here: the forms already offer recently-uploaded
 * thumbnails inline, which is the better path for "attach the photo I just used".
 * This screen is for "what images does the club have?" and for the answer to "who
 * put this one there".
 */
export default function MediaLibrary({
  uploads,
  isSuperAdmin,
}: {
  uploads: MediaRow[];
  isSuperAdmin: boolean;
}) {
  const [state, deleteAction] = useActionState(deleteImage, initial);
  const [publishState, publishAction, publishPending] = useActionState(togglePublish, initial);
  const [uploadState, uploadAction] = useActionState(uploadImage, initial);
  const [filter, setFilter] = useState<UploadPurpose | "all">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const visible = filter === "all" ? uploads : uploads.filter((row) => row.purpose === filter);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      // Clears itself, so the confirmation cannot get stuck saying "copied" after
      // the contributor has moved on to something else.
      setTimeout(() => setCopied((current) => (current === url ? null : current)), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <>
      <form action={uploadAction} className={styles.uploadForm}>
        <input type="hidden" name="purpose" value="gallery" />
        <label className={styles.uploadLabel}>
          <span>Upload a gallery photo</span>
          <input type="file" name="file" accept="image/png,image/jpeg,image/webp,image/avif" />
        </label>
        <button type="submit" className={styles.uploadBtn}>Upload</button>
        {uploadState.message && (
          <p className={uploadState.status === "error" ? styles.formError : styles.formSuccess} role="status">
            {uploadState.message}
          </p>
        )}
      </form>

      <div className={styles.filters} role="group" aria-label="Filter by what the image is for">
        <button
          type="button"
          className={filter === "all" ? styles.filterActive : styles.filter}
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
        >
          All
        </button>
        {PURPOSES.map((purpose) => (
          <button
            key={purpose}
            type="button"
            className={filter === purpose ? styles.filterActive : styles.filter}
            onClick={() => setFilter(purpose)}
            aria-pressed={filter === purpose}
          >
            {PURPOSE_LABEL[purpose]}
          </button>
        ))}
      </div>

      {state.message && (
        <p
          className={state.status === "error" ? styles.formError : styles.formSuccess}
          role={state.status === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {state.message}
        </p>
      )}
      {publishState.message && (
        <p
          className={publishState.status === "error" ? styles.formError : styles.formSuccess}
          role={publishState.status === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {publishState.message}
        </p>
      )}

      {visible.length === 0 ? (
        <p className={styles.empty}>
          {uploads.length === 0
            ? "No images uploaded yet. Upload one from a sponsor, story, player or fixture form and it will appear here."
            : "No images for that category."}
        </p>
      ) : (
        <ul className={styles.grid}>
          {visible.map((row) => (
            <li className={styles.card} key={row.id}>
              <div className={styles.thumb}>
                {/* Unoptimised: these are arbitrary public URLs from four different
                    buckets, and next/image cannot optimise them without a remote
                                    pattern per host. */}
                <Image src={row.public_url} alt="" fill unoptimized sizes="180px" />
              </div>

              <span className={styles.purpose}>
                {PURPOSE_LABEL[row.purpose as UploadPurpose] ?? row.purpose}
              </span>

              <span className={styles.filename}>{row.original_filename ?? row.object_path}</span>

              <span className={styles.meta}>
                <span>{row.uploaded_by}</span>
                <span>{new Date(row.uploaded_at).toLocaleDateString("en-GB")}</span>
              </span>

              <div className={styles.copyRow}>
                <button
                  type="button"
                  className={styles.copy}
                  onClick={() => copy(row.public_url)}
                  aria-label={`Copy the web address of ${row.original_filename ?? row.object_path}`}
                >
                  {copied === row.public_url ? "Copied" : "Copy URL"}
                </button>

                {isSuperAdmin && row.purpose === "gallery" && (
                  <form action={publishAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="publish" value={row.is_published ? "false" : "true"} />
                    <button
                      type="submit"
                      className={row.is_published ? styles.unpublish : styles.publish}
                      disabled={publishPending}
                    >
                      {publishPending ? "Saving…" : row.is_published ? "Unpublish" : "Publish"}
                    </button>
                  </form>
                )}
                {isSuperAdmin && (
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => setConfirming(confirming === row.id ? null : row.id)}
                    aria-expanded={confirming === row.id}
                  >
                    Delete
                  </button>
                )}
              </div>

              {confirming === row.id && (
                <form action={deleteAction} className={styles.confirm}>
                  <input type="hidden" name="bucket" value={row.bucket} />
                  <input type="hidden" name="path" value={row.object_path} />
                  <p className={styles.confirmText}>
                    Delete this image? Anything still using it will show a gap. The upload record
                    is kept.
                  </p>
                  <button type="submit" className={styles.confirmButton}>
                    Yes, delete
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
