"use client";

import { useActionState } from "react";
import { updateAdminPassword } from "../actions";
import type { FixtureActionState } from "@/types/fixtures";
import styles from "../Admin.module.css";

const initial: FixtureActionState = { status: "idle", message: "" };

export default function PasswordForm() {
  const [state, action, pending] = useActionState(updateAdminPassword, initial);
  return <form action={action} className={styles.form}>
    <label htmlFor="new-password">New password</label>
    <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
    <label htmlFor="confirm-password">Confirm new password</label>
    <input id="confirm-password" name="confirm_password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
    <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save password"}</button>
    {state.message && <p className={state.status === "error" ? styles.error : styles.feedback} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
  </form>;
}
