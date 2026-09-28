"use client";

import { useActionState } from "react";
import { requestAdminLink } from "../actions";
import type { FixtureActionState } from "@/types/fixtures";
import styles from "../Admin.module.css";

const initial: FixtureActionState = { status: "idle", message: "" };

export default function AdminLoginForm({ callbackError }: { callbackError: boolean }) {
  const [state, action, pending] = useActionState(requestAdminLink, initial);
  return <>
    {callbackError && <div className={styles.error} role="alert">That sign-in link could not be verified. Request a fresh link.</div>}
    <form action={action} className={styles.form}>
      <label htmlFor="admin-email">Email address</label>
      <input id="admin-email" name="email" type="email" autoComplete="email" required maxLength={254} />
      <button type="submit" disabled={pending}>{pending ? "Sending…" : "Email me a sign-in link"}</button>
      <p className={state.status === "error" ? styles.error : styles.feedback} role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p>
    </form>
  </>;
}
