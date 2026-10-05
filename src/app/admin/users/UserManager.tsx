"use client";

import { useActionState, useState } from "react";
import { addAdmin, changeAdminRole, removeAdmin } from "./actions";
import type { FixtureActionState } from "@/types/fixtures";
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, type Role } from "@/lib/admin/role-constants";
import styles from "./UserManager.module.css";

const initial: FixtureActionState = { status: "idle", message: "" };

export type AdminRow = { email: string; role: Role; created_at: string };

export default function UserManager({ admins, currentEmail }: { admins: AdminRow[]; currentEmail: string }) {
  const [addState, addAction, addPending] = useActionState(addAdmin, initial);
  const [roleState, roleAction, rolePending] = useActionState(changeAdminRole, initial);
  const [removeState, removeAction, removePending] = useActionState(removeAdmin, initial);
  const [removing, setRemoving] = useState<string | null>(null);

  const superAdmins = admins.filter((admin) => admin.role === "super_admin").length;

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Administrators</h2>
        <p className={styles.hint}>
          {admins.length} {admins.length === 1 ? "person has" : "people have"} access, {superAdmins}{" "}
          {superAdmins === 1 ? "is" : "are"} super admin. An administrator must already have a Supabase
          sign-in before they appear here: create their account at /admin/login first, then add their
          email below.
        </p>

        <ul className={styles.list}>
          {admins.map((admin) => {
            const isSelf = admin.email.toLowerCase() === currentEmail.toLowerCase();
            const isLastSuper = admin.role === "super_admin" && superAdmins === 1;
            return (
              <li className={styles.row} key={admin.email}>
                <div className={styles.identity}>
                  <span className={styles.email}>{admin.email}</span>
                  {isSelf && <span className={styles.you}>You</span>}
                  {isLastSuper && (
                    <span className={styles.lastSuper} title="The site always keeps at least one super admin">
                      Last super admin
                    </span>
                  )}
                </div>

                <form action={roleAction} className={styles.roleForm}>
                  <input type="hidden" name="email" value={admin.email} />
                  <label className={styles.srOnly} htmlFor={`role-${admin.email}`}>
                    Role for {admin.email}
                  </label>
                  <select
                    id={`role-${admin.email}`}
                    name="role"
                    defaultValue={admin.role}
                    disabled={isLastSuper || rolePending}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className={styles.secondary} disabled={isLastSuper || rolePending}>
                    Update
                  </button>
                </form>

                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => setRemoving(removing === admin.email ? null : admin.email)}
                  aria-expanded={removing === admin.email}
                  disabled={isSelf || isLastSuper}
                  title={
                    isSelf
                      ? "You cannot remove your own account"
                      : isLastSuper
                        ? "Promote another super admin first"
                        : undefined
                  }
                >
                  Remove
                </button>

                {removing === admin.email && (
                  <form action={removeAction} className={styles.confirm}>
                    <input type="hidden" name="email" value={admin.email} />
                    <p className={styles.confirmText}>
                      Remove {admin.email}? They will lose access immediately.
                    </p>
                    <div className={styles.confirmActions}>
                      <button type="submit" className={styles.danger} disabled={removePending}>
                        {removePending ? "Removing…" : "Yes, remove"}
                      </button>
                      <button type="button" className={styles.secondary} onClick={() => setRemoving(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ul>

        <p className={roleState.status === "error" ? styles.error : styles.success} role={roleState.status === "error" ? "alert" : "status"} aria-live="polite">
          {roleState.message}
        </p>
        <p className={removeState.status === "error" ? styles.error : styles.success} role={removeState.status === "error" ? "alert" : "status"} aria-live="polite">
          {removeState.message}
        </p>
      </section>

      <form action={addAction} className={styles.card}>
        <h2 className={styles.cardTitle}>Add an administrator</h2>
        <p className={styles.hint}>
          The person must already be able to sign in at /admin/login. Adding an email here grants
          access; it does not create their account.
        </p>

        <div className={styles.field}>
          <label htmlFor="new-admin-email">Email address</label>
          <input id="new-admin-email" name="email" type="email" required maxLength={254} />
        </div>

        <div className={styles.field}>
          <label htmlFor="new-admin-role">Role</label>
          <select id="new-admin-role" name="role" defaultValue="content">
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]} — {ROLE_DESCRIPTIONS[role]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={addPending}>
            {addPending ? "Adding…" : "Add administrator"}
          </button>
        </div>

        <p className={addState.status === "error" ? styles.error : styles.success} role={addState.status === "error" ? "alert" : "status"} aria-live="polite">
          {addState.message}
        </p>
      </form>
    </div>
  );
}
