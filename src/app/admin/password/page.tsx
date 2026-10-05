import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import PasswordForm from "./PasswordForm";
import styles from "../login/login.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPasswordPage() {
  if (!getSupabaseConfig()) redirect("/admin/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?error=callback");
  return <main className={styles.shell}>
    <section className={styles.loginCard}>
      <p className={styles.kicker}>SHAITA ANGELS FC · CLUB ADMIN</p>
      <h1>Choose a password.</h1>
      <p className={styles.muted}>Set a password for {user.email}. Use at least 12 characters.</p>
      <PasswordForm />
      <Link className={styles.backLink} href="/admin/login">← Back to sign in</Link>
    </section>
  </main>;
}
