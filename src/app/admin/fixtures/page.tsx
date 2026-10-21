import { getAdminContext } from "@/lib/admin/roles";
import { getCompetitionsForAdmin } from "@/lib/reference-data.server";
import { FIXTURE_COLUMNS } from "@/lib/fixtures";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import FixtureManager from "./FixtureManager";
import type { Fixture } from "@/types/fixtures";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Fixtures" };

export default async function FixturesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; created?: string }>;
}) {
  const context = requireScreen(await getAdminContext(), "fixtures");
  const [{ data, error }, { saved, created }, competitions] = await Promise.all([
    context.supabase
      .from("fixtures")
      .select(FIXTURE_COLUMNS)
      .order("match_date", { ascending: false }),
    searchParams,
    getCompetitionsForAdmin(),
  ]);

  const fixtures = (data ?? []) as Fixture[];
  const createdCount = Number(created);

  return (
    <AdminShell
      context={context}
      active="fixtures"
      title="Fixtures"
      description="Fixtures publish to the match centre and the homepage rail. Unpublishing hides a fixture from the public site without deleting its record."
    >
      {saved === "1" && (
        <p className={styles.notice} role="status">
          Fixture saved.
        </p>
      )}
      {Number.isInteger(createdCount) && createdCount > 0 && (
        <p className={styles.notice} role="status">
          {createdCount === 1 ? "1 fixture created." : `${createdCount} fixtures created.`}
        </p>
      )}
      {error && (
        <p className={styles.notice} role="alert">
          Fixtures could not be loaded. Refresh to try again.
        </p>
      )}

      <FixtureManager fixtures={fixtures} competitions={competitions} />
    </AdminShell>
  );
}
