import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getAdminContext } from "@/lib/supabase/admin";
import type { Fixture } from "@/types/fixtures";
import FixtureManager from "./FixtureManager";
import { signOutAction } from "./actions";
import styles from "./Admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  if (!getSupabaseConfig()) return <main className={styles.shell}><section className={styles.loginCard}><p className={styles.kicker}>CLUB ADMIN</p><h1>Setup required.</h1><p className={styles.muted}>Configure Supabase environment variables and apply the fixtures migration before using the admin panel.</p></section></main>;
  const context = await getAdminContext();
  if (!context) redirect("/admin/login");
  const [{ data, error }, { saved }] = await Promise.all([
    context.supabase.from("fixtures").select("id, opponent, competition, season, match_date, kickoff_time, venue, venue_type, status, shaita_goals, opponent_goals, notes, is_published, created_at, updated_at").order("match_date", { ascending: false }),
    searchParams,
  ]);
  const fixtures = (data ?? []) as Fixture[];
  return <main className={styles.shell}>
    <header className={styles.header}><div><p className={styles.kicker}>SHAITA ANGELS FC · CLUB ADMIN</p><h1>Fixtures &amp; results</h1><p className={styles.muted}>Signed in as {context.user.email}</p></div><form action={signOutAction}><button className={styles.secondaryButton} type="submit">Sign out</button></form></header>
    {saved === "1" && <p className={styles.notice} role="status">Fixture saved.</p>}
    {error && <p className={styles.error} role="alert">Fixtures could not be loaded. Refresh to try again.</p>}
    <FixtureManager fixtures={fixtures} />
  </main>;
}
