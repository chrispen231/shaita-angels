import { redirect } from "next/navigation";
import Link from "next/link";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getAdminContext } from "@/lib/supabase/admin";
import AdminLoginForm from "./AdminLoginForm";
import styles from "../Admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const config = getSupabaseConfig();
  if (config && await getAdminContext()) redirect("/admin");
  const { error } = await searchParams;
  return <main className={styles.shell}>
    <section className={styles.loginCard}>
      <p className={styles.kicker}>SHAITA ANGELS FC · CLUB ADMIN</p>
      <h1>Sign in securely.</h1>
      <p className={styles.muted}>Request a one-time sign-in link. Only an authorized club administrator can manage published fixtures and results.</p>
      {!config ? <div className={styles.notice} role="status">Supabase is not configured. Add the required environment variables to enable admin sign-in.</div> : <AdminLoginForm callbackError={error === "callback"} />}
      <Link className={styles.backLink} href="/matches">← Back to matches</Link>
    </section>
  </main>;
}
