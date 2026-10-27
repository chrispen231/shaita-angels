import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getAdminContext } from "@/lib/supabase/admin";
import AdminLoginForm from "./AdminLoginForm";
import LoginBackdrop from "./LoginBackdrop";
import styles from "./login.module.css";

import { ArrowLeft } from "lucide-react";
export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const config = getSupabaseConfig();
  // Already signed in? Preserve the app's existing redirect rather than showing
  // the form again.
  if (config && await getAdminContext()) redirect("/admin");
  const { error } = await searchParams;
  return <>
    <LoginBackdrop />
    <main className={styles.shell}>
      <section className={styles.loginCard}>
        <div className={styles.brand}>
          <Image className={styles.brandMark} src="/shaita-angels-logo.png" alt="" width={44} height={44} />
          <div className={styles.brandText}>
            <span className={styles.brandName}>Shaita Angels</span>
            <span className={styles.brandSub}>Club admin</span>
          </div>
        </div>
        <p className={styles.kicker}>SHAITA ANGELS FC · CLUB ADMIN</p>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your admin account</p>
        {!config ? <div className={styles.notice} role="status">Supabase is not configured. Add the required environment variables to enable admin sign-in.</div> : <AdminLoginForm callbackError={error === "callback"} />}
        <Link className={styles.backLink} href="/matches"><ArrowLeft className="inline-icon" /> Back to matches</Link>
      </section>
    </main>
  </>;
}
