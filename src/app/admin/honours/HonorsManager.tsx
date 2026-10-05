"use client";

import { useActionState, useState } from "react";
import { saveHonor, removeHonor, moveHonor } from "@/app/admin/news/actions";
import type { FixtureActionState } from "@/types/fixtures";
import styles from "./HonorsManager.module.css";

const initial: FixtureActionState = { status: "idle", message: "" };

export type HonorRow = {
  id: string;
  year_label: string;
  name: string;
  detail: string | null;
  is_published: boolean;
};

/**
 * Honours editor.
 *
 * Reuses the article actions from /admin/news/actions rather than duplicating
 * them: both tables have the same access rule (content editors) and the same
 * validation shape, and two copies of a write path is two places for the role check
 * to drift out of step with the policy.
 *
 * Order is controlled by explicit up/down controls rather than a numeric field,
 * because the club thinks in terms of "most recent first" and a sort_order box is
 * a number nobody can reason about.
 */
export default function HonorsManager({ honors }: { honors: HonorRow[] }) {
  const [saveState, saveAction, savePending] = useActionState(saveHonor, initial);
  const [removeState, removeAction, removePending] = useActionState(removeHonor, initial);
  const [moveState, moveAction] = useActionState(moveHonor, initial);

  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          {honors.length} {honors.length === 1 ? "entry" : "entries"}
        </h2>
        <p className={styles.hint}>
          Shown on the club page and the homepage. Use the arrows to set the order; the club page
          reads top to bottom.
        </p>

        {honors.length === 0 ? (
          <p className={styles.hint}>No honours recorded yet. Add the first below.</p>
        ) : (
          <ul className={styles.list}>
            {honors.map((honor, index) => (
              <li className={styles.row} key={honor.id}>
                <div className={styles.order}>
                  <form action={moveAction}>
                    <input type="hidden" name="id" value={honor.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      className={styles.arrow}
                      disabled={index === 0}
                      aria-label={`Move ${honor.name} up`}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveAction}>
                    <input type="hidden" name="id" value={honor.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      className={styles.arrow}
                      disabled={index === honors.length - 1}
                      aria-label={`Move ${honor.name} down`}
                    >
                      ↓
                    </button>
                  </form>
                </div>

                <div className={styles.identity}>
                  <span className={styles.name}>
                    <span className={styles.year}>{honor.year_label}</span>
                    {honor.name}
                  </span>
                  {honor.detail && <span className={styles.detail}>{honor.detail}</span>}
                </div>

                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => setEditing(editing === honor.id ? null : honor.id)}
                    aria-expanded={editing === honor.id}
                  >
                    {editing === honor.id ? "Close" : "Edit"}
                  </button>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => setConfirming(confirming === honor.id ? null : honor.id)}
                    aria-expanded={confirming === honor.id}
                  >
                    Remove
                  </button>
                </div>

                {editing === honor.id && (
                  <form action={saveAction} className={styles.editForm}>
                    <input type="hidden" name="id" value={honor.id} />
                    <HonorFields honor={honor} />
                    <div className={styles.actions}>
                      <button type="submit" disabled={savePending}>
                        {savePending ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  </form>
                )}

                {confirming === honor.id && (
                  <form action={removeAction} className={styles.confirm}>
                    <input type="hidden" name="id" value={honor.id} />
                    <p className={styles.confirmText}>
                      Remove &ldquo;{honor.name}&rdquo; ({honor.year_label})? This deletes the entry
                      rather than hiding it.
                    </p>
                    <div className={styles.confirmActions}>
                      <button type="submit" className={styles.danger} disabled={removePending}>
                        {removePending ? "Removing…" : "Yes, remove"}
                      </button>
                      <button
                        type="button"
                        className={styles.secondary}
                        onClick={() => setConfirming(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className={moveState.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
          {moveState.message}
        </p>
        <p className={removeState.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
          {removeState.message}
        </p>
      </section>

      <form action={saveAction} className={styles.card}>
        <h2 className={styles.cardTitle}>Add an honour</h2>
        <p className={styles.hint}>
          Year or season, the competition, and how it was won. New entries appear at the end of the
          list.
        </p>

        <HonorFields />

        <div className={styles.actions}>
          <button type="submit" disabled={savePending}>
            {savePending ? "Saving…" : "Add honour"}
          </button>
        </div>

        <p className={saveState.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
          {saveState.message}
        </p>
      </form>
    </div>
  );
}

function HonorFields({ honor }: { honor?: HonorRow }) {
  const id = (name: string) => `${honor ? "edit" : "new"}-${name}`;

  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label htmlFor={id("year")}>Year or season</label>
        <input
          id={id("year")}
          name="year_label"
          required
          maxLength={20}
          defaultValue={honor?.year_label ?? ""}
          placeholder="2024-25"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={id("name")}>Competition</label>
        <input
          id={id("name")}
          name="name"
          required
          maxLength={120}
          defaultValue={honor?.name ?? ""}
          placeholder="Orange Cup"
        />
      </div>

      <div className={`${styles.field} ${styles.fieldWide}`}>
        <label htmlFor={id("detail")}>Detail</label>
        <input
          id={id("detail")}
          name="detail"
          maxLength={200}
          defaultValue={honor?.detail ?? ""}
          placeholder="Winners · 4–3 on penalties"
        />
      </div>
    </div>
  );
}
