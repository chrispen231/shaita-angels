"use client";

import { useActionState, useState } from "react";
import ImageField from "@/app/admin/ImageField";
import { EXPECTED_UPDATED_AT_FIELD } from "@/lib/admin/concurrency";
import type { FixtureActionState } from "@/types/fixtures";
import { addLeader, removeLeader, setLeaderPublished, updateLeader } from "./actions";
import styles from "@/app/admin/staff/StaffManager.module.css";

const initial: FixtureActionState = { status: "idle", message: "" };

export type LeaderRow = {
  id: string;
  full_name: string;
  role: string;
  bio: string | null;
  photo_url: string | null;
  photo_alt: string | null;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
};

export default function LeadershipManager({ leaders }: { leaders: LeaderRow[] }) {
  const [addState, addAction, addPending] = useActionState(addLeader, initial);
  const [editState, editAction, editPending] = useActionState(updateLeader, initial);
  const [visibilityState, visibilityAction] = useActionState(setLeaderPublished, initial);
  const [removeState, removeAction, removePending] = useActionState(removeLeader, initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{leaders.length} {leaders.length === 1 ? "profile" : "profiles"}</h2>
        {leaders.length === 0 ? (
          <p className={styles.hint}>No leadership profiles yet. Add the first one below.</p>
        ) : (
          <ul className={styles.list}>
            {leaders.map((leader) => {
              const isEditing = editing === leader.id;
              return (
                <li className={styles.row} key={leader.id}>
                  <div className={styles.identity}>
                    <span className={styles.name}>{leader.full_name}</span>
                    <span className={styles.meta}>{leader.role}</span>
                    <span className={styles.flags}>
                      <span className={leader.is_published ? styles.published : styles.draft}>
                        {leader.is_published ? "Published" : "Unpublished"}
                      </span>
                    </span>
                  </div>
                  <div className={styles.rowActions}>
                    <button type="button" className={styles.secondary} onClick={() => setEditing(isEditing ? null : leader.id)} aria-expanded={isEditing}>
                      {isEditing ? "Close" : "Edit"}
                    </button>
                    <form action={visibilityAction}>
                      <input type="hidden" name="id" value={leader.id} />
                      <input type="hidden" name="publish" value={leader.is_published ? "false" : "true"} />
                      <button type="submit" className={styles.secondary}>{leader.is_published ? "Unpublish" : "Publish"}</button>
                    </form>
                    <button type="button" className={styles.removeButton} onClick={() => setConfirming(confirming === leader.id ? null : leader.id)} aria-expanded={confirming === leader.id}>Remove</button>
                  </div>
                  {isEditing && (
                    <form action={editAction} className={styles.editForm}>
                      <input type="hidden" name="id" value={leader.id} />
                      <input type="hidden" name={EXPECTED_UPDATED_AT_FIELD} value={leader.updated_at} />
                      <LeaderFields leader={leader} />
                      <div className={styles.actions}><button type="submit" disabled={editPending}>{editPending ? "Saving…" : "Save changes"}</button></div>
                    </form>
                  )}
                  {confirming === leader.id && (
                    <form action={removeAction} className={styles.confirm}>
                      <input type="hidden" name="id" value={leader.id} />
                      <p className={styles.confirmText}>Remove {leader.full_name} from club leadership?</p>
                      <div className={styles.confirmActions}>
                        <button type="submit" className={styles.danger} disabled={removePending}>{removePending ? "Removing…" : "Yes, remove"}</button>
                        <button type="button" className={styles.secondary} onClick={() => setConfirming(null)}>Cancel</button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <StateMessage state={editState} /><StateMessage state={visibilityState} /><StateMessage state={removeState} />
      </section>

      <form action={addAction} className={styles.card}>
        <h2 className={styles.cardTitle}>Add a leadership profile</h2>
        <p className={styles.hint}>New profiles start unpublished. Publish them when details are ready for the public site.</p>
        <LeaderFields />
        <div className={styles.actions}><button type="submit" disabled={addPending}>{addPending ? "Adding…" : "Add profile"}</button></div>
        <StateMessage state={addState} />
      </form>
    </div>
  );
}

function LeaderFields({ leader }: { leader?: LeaderRow }) {
  const id = (field: string) => `${leader ? `edit-${leader.id}` : "new"}-${field}`;
  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label htmlFor={id("name")}>Full name</label>
        <input id={id("name")} name="full_name" required maxLength={120} defaultValue={leader?.full_name ?? ""} />
      </div>
      <div className={styles.field}>
        <label htmlFor={id("role")}>Leadership position</label>
        <input id={id("role")} name="role" required maxLength={120} placeholder="e.g. President, Vice President, Secretary" defaultValue={leader?.role ?? ""} />
      </div>
      <div className={styles.field}>
        <label htmlFor={id("sort")}>Display order</label>
        <input id={id("sort")} name="sort_order" type="number" inputMode="numeric" min={0} max={9999} step={1} defaultValue={leader?.sort_order ?? 0} />
      </div>
      <div className={`${styles.field} ${styles.fieldWide}`}>
        <ImageField name="photo_url" label="Portrait" purpose="leadership" defaultValue={leader?.photo_url} altName="photo_alt" defaultAlt={leader?.photo_alt} hint="Optional. Add a portrait to include the profile photo in the public media gallery." />
      </div>
      <div className={`${styles.field} ${styles.fieldWide}`}>
        <label htmlFor={id("bio")}>Biography</label>
        <textarea id={id("bio")} name="bio" rows={5} maxLength={2400} defaultValue={leader?.bio ?? ""} placeholder="A short introduction to this leader's role and contribution." />
      </div>
    </div>
  );
}

function StateMessage({ state }: { state: FixtureActionState }) {
  return (
    <p className={state.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
      {state.message}
    </p>
  );
}
