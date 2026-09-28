"use client";

import { useActionState } from "react";
import { requestPasswordReset, signInAdmin } from "../actions";
import type { FixtureActionState } from "@/types/fixtures";
import styles from "../Admin.module.css";

const initial: FixtureActionState = { status: "idle", message: "" };

export default function AdminLoginForm({ callbackError }: { callbackError: boolean }) {
  const [state, action, pending] = useActionState(signInAdmin, initial);
  const [resetState, resetAction, resetPending] = useActionState(requestPasswordReset, initial);
  return <>
    {callbackError && <div className={styles.error} role="alert">That password reset link could not be verified or has expired. Request another reset link.</div>}
    <form action={action} className={styles.form}>
      <label htmlFor="admin-email">Email address</label>
      <input id="admin-email" name="email" type="email" autoComplete="email" required maxLength={254} />
      <label htmlFor="admin-password">Password</label>
      <input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={128} />
      <button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p className={state.status === "error" ? styles.error : styles.feedback} role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p>
    </form>
    <details className={styles.resetDetails}>
      <summary>Forgot or need to set your password?</summary>
      <p className={styles.muted}>We’ll email a secure link so you can choose a password for this admin account.</p>
      <form action={resetAction} className={styles.form}>
        <label htmlFor="reset-email">Email address</label>
        <input id="reset-email" name="email" type="email" autoComplete="email" required maxLength={254} />
        <button type="submit" disabled={resetPending}>{resetPending ? "Sending…" : "Send password reset link"}</button>
        {resetState.message && <p className={resetState.status === "error" ? styles.error : styles.feedback} role={resetState.status === "error" ? "alert" : "status"}>{resetState.message}</p>}
      </form>
    </details>
  </>;
}
