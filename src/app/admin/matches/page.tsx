import Link from "next/link";
import { getAdminContext } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Matches & lineups" };

export default async function MatchesPage() {
  const context = requireScreen(await getAdminContext(), "matches");

  const [fixtures, goals, lineups] = await Promise.all([
    context.supabase
      .from("fixtures")
      .select("id, opponent, match_date, competition, status, is_published")
      .order("match_date", { ascending: false }),
    context.supabase.from("match_goals").select("fixture_id"),
    context.supabase.from("lineups").select("fixture_id"),
  ]);

  const goalsByFixture = new Map<string, number>();
  for (const row of goals.data ?? []) {
    const key = String(row.fixture_id);
    goalsByFixture.set(key, (goalsByFixture.get(key) ?? 0) + 1);
  }
  const lineupsByFixture = new Map<string, number>();
  for (const row of lineups.data ?? []) {
    const key = String(row.fixture_id);
    lineupsByFixture.set(key, (lineupsByFixture.get(key) ?? 0) + 1);
  }

  const rows = fixtures.data ?? [];

  return (
    <AdminShell
      context={context}
      active="matches"
      title="Matches & lineups"
      description="Lineups, goals, cards and the match report, entered per match."
    >
      {rows.length === 0 ? (
        <p className={styles.empty}>No matches yet. Add one from Fixtures.</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((fixture) => {
            const id = String(fixture.id);
            const complete = (lineupsByFixture.get(id) ?? 0) > 0;
            return (
              <li key={id} className={styles.row}>
                <div className={styles.identity}>
                  <span className={styles.opponent}>{String(fixture.opponent)}</span>
                  <span className={styles.meta}>
                    {String(fixture.competition)} — {String(fixture.match_date)}
                  </span>
                  {!fixture.is_published && <span className={styles.draft}>Unpublished</span>}
                  {complete ? (
                    <span className={styles.ready}>
                      {lineupsByFixture.get(id)} players, {goalsByFixture.get(id) ?? 0} goals
                    </span>
                  ) : (
                    <span className={styles.todo}>No lineup yet</span>
                  )}
                </div>

                <Link href={`/admin/matches/${id}`} className={styles.edit}>
                  Edit
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
