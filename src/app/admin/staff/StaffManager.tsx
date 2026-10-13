"use client";

import { useActionState, useState } from "react";
import { saveStaff, updateStaff, toggleStaffPublished, removeStaff } from "./actions";
import type { FixtureActionState } from "@/types/fixtures";
import ImageField from "@/app/admin/ImageField";
import styles from "./StaffManager.module.css";

const initial: FixtureActionState = { status: "idle", message: "" };

export type StaffRow = {
  id: string;
  full_name: string;
  role: string;
  bio: string | null;
  photo_url: string | null;
  photo_url_alt: string | null;
  sort_order: number;
  is_published: boolean;
};

export default function StaffManager({ staff }: { staff: StaffRow[] }) {
  const [saveState, saveAction, savePending] = useActionState(saveStaff, initial);
  const [updateState, updateAction, updatePending] = useActionState(updateStaff, initial);
  const [toggleState, toggleAction] = useActionState(toggleStaffPublished, initial);
  const [removeState, removeAction, removePending] = useActionState(removeStaff, initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          {staff.length} {staff.length === 1 ? "staff member" : "staff members"}
        </h2>

        {staff.length === 0 ? (
          <p className={styles.hint}>No staff yet. Add the first one below.</p>
        ) : (
          <ul className={styles.list}>
            {staff.map((member) => {
              const isEditing = editing === member.id;
              return (
                <li className={styles.row} key={member.id}>
                  <div className={styles.identity}>
                    <span className={styles.name}>{member.full_name}</span>
                    <span className={styles.meta}>{member.role}</span>
                    <span className={styles.flags}>
                      {member.is_published ? (
                        <span className={styles.published}>Published</span>
                      ) : (
                        <span className={styles.draft}>Unpublished</span>
                      )}
                    </span>
                  </div>

                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => setEditing(isEditing ? null : member.id)}
                      aria-expanded={isEditing}
                    >
                      {isEditing ? "Close" : "Edit"}
                    </button>

                    <form action={toggleAction}>
                      <input type="hidden" name="id" value={member.id} />
                      <input type="hidden" name="publish" value={member.is_published ? "false" : "true"} />
                      <button type="submit" className={styles.secondary}>
                        {member.is_published ? "Unpublish" : "Publish"}
                      </button>
                    </form>

                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => setConfirming(confirming === member.id ? null : member.id)}
                      aria-expanded={confirming === member.id}
                    >
                      Remove
                    </button>
                  </div>

                  {isEditing && (
                    <form action={updateAction} className={styles.editForm}>
                      <input type="hidden" name="id" value={member.id} />
                      <StaffFields member={member} />
                      <div className={styles.actions}>
                        <button type="submit" disabled={updatePending}>
                          {updatePending ? "Saving…" : "Save changes"}
                        </button>
                      </div>
                    </form>
                  )}

                  {confirming === member.id && (
                    <form action={removeAction} className={styles.confirm}>
                      <input type="hidden" name="id" value={member.id} />
                      <p className={styles.confirmText}>
                        Remove {member.full_name} from the staff list?
                      </p>
                      <div className={styles.confirmActions}>
                        <button type="submit" className={styles.danger} disabled={removePending}>
                          {removePending ? "Removing…" : "Yes, remove"}
                        </button>
                        <button type="button" className={styles.secondary} onClick={() => setConfirming(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className={updateState.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
          {updateState.message}
        </p>
        <p className={toggleState.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
          {toggleState.message}
        </p>
        <p className={removeState.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
          {removeState.message}
        </p>
      </section>

      <form action={saveAction} className={styles.card}>
        <h2 className={styles.cardTitle}>Add a staff member</h2>
        <p className={styles.hint}>New staff members start unpublished.</p>
        <StaffFields />

        <div className={styles.actions}>
          <button type="submit" disabled={savePending}>
            {savePending ? "Adding…" : "Add staff member"}
          </button>
        </div>

        <p className={saveState.status === "error" ? styles.error : styles.success} role="status" aria-live="polite">
          {saveState.message}
        </p>
      </form>
    </div>
  );
}

function StaffFields({ member }: { member?: StaffRow }) {
  const id = (name: string) => `${member ? "edit" : "new"}-${name}`;

  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label htmlFor={id("name")}>Full name</label>
        <input id={id("name")} name="full_name" required maxLength={120} defaultValue={member?.full_name ?? ""} />
      </div>

      <div className={styles.field}>
        <label htmlFor={id("role")}>Role</label>
        <input
          id={id("role")}
          name="role"
          required
          maxLength={120}
          defaultValue={member?.role ?? ""}
          placeholder="e.g. Head Coach, Physiotherapist, Team Manager"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={id("sort")}>Sort order</label>
        <input
          id={id("sort")}
          name="sort_order"
          type="number"
          inputMode="numeric"
          defaultValue={member?.sort_order ?? 0}
        />
      </div>

      <div className={styles.fieldWide}>
        <ImageField
          name="photo_url"
          label="Photo"
          purpose="player"
          defaultValue={member?.photo_url ?? null}
          hint="Optional. Without one, the card uses a placeholder."
        />
      </div>

      <div className={styles.fieldWide}>
        <ImageField
          name="photo_url_alt"
          label="Alternate photo"
          purpose="player"
          defaultValue={member?.photo_url_alt ?? null}
          hint="Shown on hover, matching the player card double-photo effect."
        />
      </div>

      <div className={`${styles.field} ${styles.fieldWide}`}>
        <label htmlFor={id("bio")}>Biography</label>
        <textarea
          id={id("bio")}
          name="bio"
          rows={4}
          defaultValue={member?.bio ?? ""}
          placeholder="Shown on the staff card."
        />
      </div>
    </div>
  );
}
