import { getAdminContext } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import FixtureManager from "./FixtureManager";
import { signOutAction } from "./actions";
import type { Fixture } from "@/types/fixtures";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Fixtures" };

const FIXTURE_COLUMNS =
  "id, opponent, competition, season, match_date, kickoff_time, venue, venue_type, status, shaita_goals, opponent_goals, notes, is_published, created_at, updated_at";

export default async function FixturesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const context = requireScreen(await getAdminContext(), "fixtures");
  const [{ data, error }, { saved }] = await Promise.all([
    context.supabase
      .from("fixtures")
      .select(FIXTURE_COLUMNS)
      .order("match_date", { ascending: false }),
    searchParams,
  ]);

  const fixtures = (data ?? []) as Fixture[];

  return (
    <AdminShell
      context={context}
      active="fixtures"
      title="Fixtures"
      description="Fixtures publish to the match centre and the homepage rail. Unpublishing hides a fixture from the public site without deleting its record."
      actions={
        <form action={signOutAction}>
          <button className={styles.signOut} type="submit">
            Sign out
          </button>
        </form>
      }
    >
      {saved === "1" && (
        <p className={styles.notice} role="status">
          Fixture saved.
        </p>
      )}
      {error && (
        <p className={styles.notice} role="alert">
          Fixtures could not be loaded. Refresh to try again.
        </p>
      )}

      <FixtureManager fixtures={fixtures} />
    </AdminShell>
  );
}
