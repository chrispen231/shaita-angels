"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { uploadImage, type UploadState } from "@/app/admin/media/actions";
import {
  allowedTypes,
  humanSize,
  checkFile,
  svgWarning,
  PURPOSE_LABEL,
  SIZE_LIMIT,
  PURPOSE_BUCKET,
  type UploadPurpose,
} from "@/lib/media";
import styles from "./ImageField.module.css";

/**
 * Image field: upload, preview, or paste a URL.
 *
 * Replaces the "type an image path" text box everywhere a photo is needed. Three
 * ways in, because all three are real needs:
 *
 *   1. Upload a file. The normal case, and the reason this component exists.
 *   2. Pick an image already in the media library. The common case when a club
 *      reuses the same photograph across two stories.
 *   3. Paste a URL. For artwork that lives elsewhere, such as a sponsor's own
 *      press page.
 *
 * The upload writes the returned URL into a hidden input named `name`, so every
 * existing form reads it exactly as it read the text box before. That is why this
 * drops into the sponsor, news, player and fixture forms without changing their
 * server actions.
 *
 * Client-side validation is checked in src/lib/media.ts and shared with the server
 * action, so the two cannot disagree about what is acceptable.
 */

const initial: UploadState = { status: "idle", message: "", url: "", path: "" };

export default function ImageField({
  name,
  label,
  purpose,
  defaultValue,
  defaultAlt,
  altName,
  hint,
  /** Rendered at a wider aspect for hero images such as a news lead story. */
  wide = false,
}: {
  name: string;
  label: string;
  purpose: UploadPurpose;
  defaultValue?: string | null;
  defaultAlt?: string | null;
  altName?: string;
  hint?: string;
  wide?: boolean;
}) {
  const [state, uploadAction] = useActionState(uploadImage, initial);
  const [manual, setManual] = useState<string | null>(null);
  const [library, setLibrary] = useState<string[]>([]);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [localError, setLocalError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  /*
   * The field's value is derived during render rather than copied into state from an
   * effect. An upload is an event, not synchronisation: when the action returns a
   * URL, that URL becomes the value unless the user has since typed or picked one.
   *
   * Three sources, in priority order:
   *   1. manual   - the user typed a URL or clicked a library thumbnail
   *   2. state.url - the most recent successful upload
   *   3. the record's existing value from the server
   */
  const value = manual ?? (state.status === "success" ? state.url : defaultValue ?? "");

  /*
   * Newly uploaded URLs are folded into the recent list. Doing it during render
   * would be a side effect, so the list is keyed off the last URL seen and only
   * extended when that key changes.
   */
  const lastUploaded = state.status === "success" ? state.url : "";
  if (lastUploaded && library[0] !== lastUploaded) {
    setLibrary((current) =>
      current[0] === lastUploaded ? current : [lastUploaded, ...current].slice(0, 12),
    );
  }

  const bucket = PURPOSE_BUCKET[purpose];
  const limit = SIZE_LIMIT[bucket];
  const accept = allowedTypes(purpose).join(",");

  function onFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const check = checkFile(file, purpose);
    if (!check.ok) {
      setLocalError(check.message);
      event.target.value = "";
      return;
    }
    setLocalError("");
  }

  return (
    <div className={`${styles.field} ${wide ? styles.wide : ""}`}>
      <span className={styles.label}>{label}</span>

      <div className={styles.tabs} role="group" aria-label={`${label} source`}>
        <button
          type="button"
          className={mode === "upload" ? styles.tabActive : styles.tab}
          onClick={() => setMode("upload")}
          aria-pressed={mode === "upload"}
        >
          Upload
        </button>
        <button
          type="button"
          className={mode === "url" ? styles.tabActive : styles.tab}
          onClick={() => setMode("url")}
          aria-pressed={mode === "url"}
        >
          Use a URL
        </button>
      </div>

      {mode === "upload" ? (
        <div className={styles.uploadBox}>
          <label className={styles.dropzone}>
            <input
              ref={fileInput}
              type="file"
              accept={accept}
              className={styles.fileInput}
              onChange={onFileChosen}
              aria-label={`${label}: choose an image to upload`}
            />
            <span className={styles.dropzoneText}>
              <strong>Choose an image</strong>
              <span>
                {allowedTypes(purpose)
                  .map((t) => t.replace("image/", "").replace("jpeg", "jpg").replace("+xml", ""))
                  .join(", ")}{" "}
                up to {humanSize(limit)}
              </span>
            </span>
          </label>

          {localError && (
            <p className={styles.error} role="alert">
              {localError}
            </p>
          )}

          <form action={uploadAction} className={styles.uploadForm}>
            <input type="hidden" name="purpose" value={purpose} />
            {/* The chosen file has to travel with the submit, so it is mirrored into
                this form rather than read from the label's input. */}
            <input
              type="file"
              name="file"
              accept={accept}
              className={styles.srOnly}
              aria-label={`${label}: file to upload`}
            />
            <UploadButton purpose={purpose} />
          </form>

          {state.message && (
            <p
              className={state.status === "error" ? styles.error : styles.success}
              role={state.status === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {state.message}
            </p>
          )}

          {library.length > 0 && (
            <div className={styles.library}>
              <span className={styles.libraryLabel}>Recently uploaded</span>
              <div className={styles.libraryRow}>
                {library.map((url) => (
                  <button
                    key={url}
                    type="button"
                    className={styles.libraryItem}
                    onClick={() => setManual(url)}
                    aria-label="Use an image you uploaded"
                  >
                    <Image src={url} alt="" width={56} height={56} unoptimized />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <input
          type="url"
          className={styles.urlInput}
          placeholder="https://example.com/image.jpg"
          value={mode === "url" ? (manual ?? state.url ?? defaultValue ?? "") : ""}
          onChange={(event) => setManual(event.target.value)}
          aria-label={`${label}: image URL`}
        />
      )}

      {/* The value the form actually submits. */}
      <input type="hidden" name={name} value={value} />

      {value && (
        <div className={styles.preview}>
          {/* Unoptimised because the URL may be any host, and next/image refuses to
              optimise an arbitrary remote pattern without a config entry. */}
          <Image src={value} alt="" width={96} height={96} unoptimized className={styles.previewImage} />
          <div className={styles.previewMeta}>
            <span className={styles.previewLabel}>Selected</span>
            <span className={styles.previewUrl}>{value}</span>
            <button
              type="button"
              className={styles.clear}
              onClick={() => {
                setManual(null);
                setLibrary([]);
              }}
            >
              Remove image
            </button>
          </div>
        </div>
      )}

      {altName && (
        <div className={styles.altField}>
          <label htmlFor={`${name}-alt`}>Image description</label>
          <input
            id={`${name}-alt`}
            name={altName}
            type="text"
            maxLength={200}
            defaultValue={defaultAlt ?? ""}
            placeholder="Describe the image for someone who cannot see it"
          />
        </div>
      )}

      {hint && <p className={styles.hint}>{hint}</p>}
      {svgWarning(purpose) && <p className={styles.hint}>{svgWarning(purpose)}</p>}
    </div>
  );
}

/** Takes the purpose as a prop: useFormStatus exposes only its own form's state. */
function UploadButton({ purpose }: { purpose: UploadPurpose }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.uploadButton} disabled={pending}>
      {pending ? "Uploading…" : `Upload ${PURPOSE_LABEL[purpose].toLowerCase()}`}
    </button>
  );
}
