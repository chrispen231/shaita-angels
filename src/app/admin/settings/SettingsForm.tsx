"use client";

import { useActionState, useState } from "react";
import { saveSettings } from "@/app/admin/sponsors/actions";
import type { FixtureActionState } from "@/types/fixtures";
import type { SiteSettings } from "@/types/sponsors";
import { SOCIAL_PLATFORMS } from "@/types/sponsors";
import styles from "./SettingsForm.module.css";

const initial: FixtureActionState = { status: "idle", message: "" };

/**
 * Social handles are edited as an ordered list and serialised into the jsonb
 * column. Keeping order in the data means the club can lead with Facebook and
 * WhatsApp without a code change, which is the point of making this editable.
 */
export default function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action, pending] = useActionState(saveSettings, initial);
  const [handles, setHandles] = useState(settings.social_handles ?? []);

  const update = (index: number, patch: Partial<(typeof handles)[number]>) => {
    setHandles((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );
  };

  const move = (index: number, direction: -1 | 1) => {
    setHandles((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <form action={action} className={styles.card}>
      <input type="hidden" name="social_handles" value={JSON.stringify(handles)} />

      <h2 className={styles.cardTitle}>Social links</h2>
      <p className={styles.hint}>
        Order matters: the first entries appear left to right on the public band. Only entries with a
        valid http or https link are saved.
      </p>

      {handles.length === 0 && <p className={styles.emptyRow}>No social links yet.</p>}

      <ul className={styles.handleList}>
        {handles.map((handle, index) => (
          <li className={styles.handle} key={`${handle.platform}-${index}`}>
            <div className={styles.handleFields}>
              <div className={styles.field}>
                <label htmlFor={`platform-${index}`}>Platform</label>
                <select
                  id={`platform-${index}`}
                  value={handle.platform}
                  onChange={(event) => {
                    const platform = event.target.value;
                    const known = SOCIAL_PLATFORMS.find((entry) => entry.slug === platform);
                    update(index, { platform, label: known?.label ?? handle.label });
                  }}
                >
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <option key={platform.slug} value={platform.slug}>
                      {platform.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor={`url-${index}`}>URL</label>
                <input
                  id={`url-${index}`}
                  value={handle.url}
                  onChange={(event) => update(index, { url: event.target.value })}
                  placeholder="https://"
                  inputMode="url"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor={`label-${index}`}>Accessible name</label>
                <input
                  id={`label-${index}`}
                  value={handle.label}
                  onChange={(event) => update(index, { label: event.target.value })}
                />
              </div>

              <label className={styles.publishToggle} htmlFor={`published-${index}`}>
                <input
                  id={`published-${index}`}
                  type="checkbox"
                  checked={handle.is_published}
                  onChange={(event) => update(index, { is_published: event.target.checked })}
                />
                Shown
              </label>
            </div>

            <div className={styles.handleControls}>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${handle.label} earlier`}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === handles.length - 1}
                aria-label={`Move ${handle.label} later`}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => setHandles((current) => current.filter((_, i) => i !== index))}
                aria-label={`Remove ${handle.label}`}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondary}
          onClick={() =>
            setHandles((current) => [
              ...current,
              { platform: "facebook", url: "https://", label: "Facebook", is_published: false },
            ])
          }
        >
          + Add a link
        </button>
      </div>

      <h2 className={styles.cardTitle}>Contact</h2>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="contact-email">Contact email</label>
          <input
            id="contact-email"
            name="contact_email"
            type="email"
            defaultValue={settings.contact_email ?? ""}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="phone-orders">Order phone number</label>
          <input
            id="phone-orders"
            name="phone_orders"
            defaultValue={settings.phone_orders ?? ""}
          />
          <p className={styles.hint}>Shown on the shop page for jersey orders.</p>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
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
  );
}