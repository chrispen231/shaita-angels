"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { saveSponsor, deleteSponsor, setSponsorPublished } from "./actions";
import type { FixtureActionState } from "@/types/fixtures";
import type { Sponsor } from "@/types/sponsors";
import { SPONSOR_TIER_LABELS } from "@/types/sponsors";
import { resolveSponsorLogo } from "@/lib/sponsors/logo-url";
import styles from "./SponsorForm.module.css";

const initial: FixtureActionState = { status: "idle", message: "" };

export default function SponsorForm({ sponsor }: { sponsor: Sponsor | null }) {
  const [state, action, pending] = useActionState(saveSponsor, initial);
  const [publishState, publishAction, publishPending] = useActionState(setSponsorPublished, initial);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteSponsor, initial);
  const [confirmName, setConfirmName] = useState("");

  const [name, setName] = useState(sponsor?.name ?? "");
  const [tier, setTier] = useState<number>(sponsor?.tier ?? 3);
  const [url, setUrl] = useState(sponsor?.url ?? "");
  const [altText, setAltText] = useState(sponsor?.alt_text ?? "");
  const [logoPathValue, setLogoPathValue] = useState(sponsor?.logo_path ?? "");

  // Preview the record as it currently stands, plus whatever the typed name
  // would resolve to, so adding "NEEV Liberia" shows its artwork immediately.
  const previewSrc = resolveSponsorLogo({
    name: name || sponsor?.name || "",
    logo_path: logoPathValue,
  });

  return (
    <div className={styles.wrap}>
      <form action={action} className={styles.card}>
        {sponsor && <input type="hidden" name="id" value={sponsor.id} />}

        <div className={styles.preview}>
          {previewSrc ? (
            <Image src={previewSrc} alt="" width={160} height={92} className={styles.previewImage} />
          ) : (
            <span className={styles.previewEmpty}>No logo yet</span>
          )}
          <p className={styles.previewNote}>
            Shown at {tier === 1 ? "92" : "75"}px on the public band. Uploads are normalised to a single
            ink tone so the band reads as one set.
          </p>
        </div>

        <div className={styles.field}>
          <label htmlFor="sponsor-name">Sponsor name</label>
          <input
            id="sponsor-name"
            name="name"
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="sponsor-tier">Tier</label>
          <select
            id="sponsor-tier"
            name="tier"
            value={tier}
            onChange={(event) => setTier(Number(event.target.value))}
          >
            <option value={1}>{SPONSOR_TIER_LABELS[1]}</option>
            <option value={2}>{SPONSOR_TIER_LABELS[2]}</option>
            <option value={3}>{SPONSOR_TIER_LABELS[3]}</option>
          </select>
          <p className={styles.hint}>Tier 1 sits alone in the top row with more space around it.</p>
        </div>

        <div className={styles.field}>
          <label htmlFor="sponsor-url">Website</label>
          <input
            id="sponsor-url"
            name="url"
            type="url"
            placeholder="https://"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="sponsor-alt">Alt text</label>
          <input
            id="sponsor-alt"
            name="alt_text"
            maxLength={200}
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
          />
          <p className={styles.hint}>Defaults to the sponsor name. Read by screen readers.</p>
        </div>

        <div className={styles.field}>
          <label htmlFor="sponsor-logo">Logo path</label>
          <input
            id="sponsor-logo"
            name="logo_path"
            placeholder="bettomax.png"
            value={logoPathValue}
            onChange={(event) => setLogoPathValue(event.target.value)}
          />
          <p className={styles.hint}>
            Optional. A file name such as <code>bettomax.png</code> uses the artwork bundled with the
            site; leave it blank and the sponsor&apos;s own name is matched instead.
          </p>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="sponsor-start">Contract starts</label>
            <input id="sponsor-start" name="starts_on" type="date" defaultValue={sponsor?.starts_on ?? ""} />
          </div>
          <div className={styles.field}>
            <label htmlFor="sponsor-end">Contract ends</label>
            <input id="sponsor-end" name="ends_on" type="date" defaultValue={sponsor?.ends_on ?? ""} />
          </div>
        </div>

        <p className={styles.hint}>
          A sponsor is hidden from the public band automatically once the end date passes, so a
          lapsed contract does not keep showing.
        </p>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="sponsor-sort">Sort order</label>
            <input
              id="sponsor-sort"
              name="sort_order"
              type="number"
              defaultValue={sponsor?.sort_order ?? 0}
            />
          </div>
          <div className={styles.checkboxField}>
            <label htmlFor="sponsor-published">
              <input
                id="sponsor-published"
                name="is_published"
                type="checkbox"
                defaultChecked={sponsor?.is_published ?? false}
              />
              Published
            </label>
            <p className={styles.hint}>Unpublished sponsors never appear on the site.</p>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={pending}>
            {pending ? "Saving…" : sponsor ? "Save changes" : "Add sponsor"}
          </button>
        </div>

        <p
          className={state.status === "error" ? styles.error : styles.success}
          role={state.status === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {state.message}
        </p>
      </form>

      {sponsor && (
        <>
          <form action={publishAction} className={styles.card}>
            <h2 className={styles.cardTitle}>Visibility</h2>
            <input type="hidden" name="id" value={sponsor.id} />
            <label htmlFor="toggle-published" className={styles.checkboxField}>
              <input
                id="toggle-published"
                name="is_published"
                type="checkbox"
                defaultChecked={sponsor.is_published}
              />
              {sponsor.is_published ? "Published on the site" : "Hidden from the site"}
            </label>
            <div className={styles.actions}>
              <button type="submit" className={styles.secondary} disabled={publishPending}>
                {publishPending ? "Saving…" : "Update visibility"}
              </button>
            </div>
            <p
              className={publishState.status === "error" ? styles.error : styles.success}
              role={publishState.status === "error" ? "alert" : "status"}
            >
              {publishState.message}
            </p>
          </form>

          <form action={deleteAction} className={`${styles.card} ${styles.dangerCard}`}>
            <h2 className={styles.cardTitle}>Remove sponsor</h2>
            <p className={styles.hint}>
              This deletes the sponsor record permanently. Type the name to confirm — a dialog can be
              dismissed by reflex, a typed name cannot.
            </p>
            <input type="hidden" name="id" value={sponsor.id} />
            <div className={styles.field}>
              <label htmlFor="confirm-name">Type {sponsor.name} to confirm</label>
              <input
                id="confirm-name"
                name="confirm_name"
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className={styles.actions}>
              <button type="submit" className={styles.danger} disabled={deletePending}>
                {deletePending ? "Removing…" : "Remove permanently"}
              </button>
            </div>
            <p
              className={deleteState.status === "error" ? styles.error : styles.success}
              role={deleteState.status === "error" ? "alert" : "status"}
            >
              {deleteState.message}
            </p>
          </form>
        </>
      )}
    </div>
  );
}