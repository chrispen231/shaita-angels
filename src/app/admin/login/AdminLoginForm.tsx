"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { requestPasswordReset, signInAdmin } from "@/app/admin/fixtures/actions";
import type { FixtureActionState } from "@/types/fixtures";
import styles from "./login.module.css";

const initial: FixtureActionState = { status: "idle", message: "" };

export default function AdminLoginForm({ callbackError }: { callbackError: boolean }) {
  const [state, action, pending] = useActionState(signInAdmin, initial);
  const [resetState, resetAction, resetPending] = useActionState(requestPasswordReset, initial);
  const [revealed, setRevealed] = useState(false);
  return <>
    {callbackError && <div className={styles.error} role="alert">That password reset link could not be verified or has expired. Request another reset link.</div>}
    <form action={action} className={styles.form}>
      <label className={styles.label} htmlFor="admin-email">Email address</label>
      <input className={styles.input} id="admin-email" name="email" type="email" placeholder="you@example.com" autoComplete="username" required maxLength={254} />
      <label className={styles.label} htmlFor="admin-password">Password</label>
      <span className={styles.passwordWrap}>
        <input className={styles.input} id="admin-password" name="password" type={revealed ? "text" : "password"} autoComplete="current-password" required maxLength={128} />
        <button
          className={styles.revealButton}
          type="button"
          onClick={() => setRevealed((value) => !value)}
          aria-label={revealed ? "Hide password" : "Show password"}
          aria-pressed={revealed}
          aria-controls="admin-password"
        >
          {revealed ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </span>
      <button className={styles.submit} type="submit" disabled={pending}>
        {pending && <span className={styles.spinner} aria-hidden="true" />}
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className={state.status === "error" ? styles.error : styles.feedback} role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p>
    </form>
    <details className={styles.resetDetails}>
      <summary>Forgot or need to set your password?</summary>
      <p className={styles.muted}>We’ll email a secure link so you can choose a password for this admin account.</p>
      <form action={resetAction} className={styles.form}>
        <label className={styles.label} htmlFor="reset-email">Email address</label>
        <input className={styles.input} id="reset-email" name="email" type="email" placeholder="you@example.com" autoComplete="username" required maxLength={254} />
        <button className={styles.submit} type="submit" disabled={resetPending}>
          {resetPending && <span className={styles.spinner} aria-hidden="true" />}
          {resetPending ? "Sending…" : "Send password reset link"}
        </button>
        {resetState.message && <p className={resetState.status === "error" ? styles.error : styles.feedback} role={resetState.status === "error" ? "alert" : "status"}>{resetState.message}</p>}
      </form>
    </details>
  </>;
}
