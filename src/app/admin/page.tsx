import Link from "next/link";
import { getAdminContext } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  SCREEN_ACCESS,
  canAccess,
  type ScreenKey,
} from "@/lib/admin/roles";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

type Tile = { screen: ScreenKey; href: string; label: string; blurb: string };

const TILES: Tile[] = [
  { screen: "fixtures", href: "/admin/fixtures", label: "Fixtures", blurb: "Add and edit the match list." },
  {
    screen: "matches",
    href: "/admin/matches",
    label: "Matches & lineups",
    blurb: "Lineups, goals, cards and reports.",
  },
  { screen: "news", href: "/admin/news", label: "News", blurb: "Stories and announcements." },
  { screen: "squad", href: "/admin/squad", label: "Squad", blurb: "Players, numbers and photos." },
  { screen: "honors", href: "/admin/honours", label: "Honours", blurb: "Trophies and milestones." },
  { screen: "media", href: "/admin/media", label: "Media library", blurb: "Images used across the site." },
  { screen: "sponsors", href: "/admin/sponsors", label: "Sponsors", blurb: "The band above the footer." },
  {
    screen: "settings",
    href: "/admin/settings",
    label: "Social & contact",
    blurb: "Social links and contact details.",
  },
  { screen: "users", href: "/admin/users", label: "Administrators", blurb: "Who can manage this site." },
];

export default async function AdminPage() {
  const context = requireScreen(await getAdminContext(), "fixtures");
  const available = TILES.filter((tile) => canAccess(context.role, tile.screen));

  let counts = { sponsors: 0, publishedSponsors: 0, fixtures: 0 };
  if (canAccess(context.role, "sponsors") || canAccess(context.role, "fixtures")) {
    const [sponsors, fixtures] = await Promise.all([
      context.supabase.from("sponsors").select("id, is_published"),
      context.supabase.from("fixtures").select("id", { count: "exact", head: true }),
    ]);
    const rows = sponsors.data ?? [];
    counts = {
      sponsors: rows.length,
      publishedSponsors: rows.filter((row) => row.is_published).length,
      fixtures: fixtures.count ?? 0,
    };
  }

  return (
    <AdminShell
      context={context}
      title="Dashboard"
      description={`Signed in as ${context.user.email}. You can reach ${available.length} of ${TILES.length} tools with the ${ROLE_LABELS[context.role]} role.`}
    >
      <section className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{counts.fixtures}</span>
          <span className={styles.statLabel}>Fixtures</span>
        </div>
        {canAccess(context.role, "sponsors") && (
          <>
            <div className={styles.stat}>
              <span className={styles.statValue}>{counts.sponsors}</span>
              <span className={styles.statLabel}>Sponsors</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{counts.publishedSponsors}</span>
              <span className={styles.statLabel}>Published</span>
            </div>
          </>
        )}
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Your tools</h2>
        <ul className={styles.tiles}>
          {available.map((tile) => (
            <li key={tile.href}>
              <Link className={styles.tile} href={tile.href}>
                <span className={styles.tileLabel}>{tile.label}</span>
                <span className={styles.tileBlurb}>{tile.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.roleSection}>
        <h2 className={styles.sectionTitle}>Your role</h2>
        <p className={styles.roleName}>{ROLE_LABELS[context.role]}</p>
        <p className={styles.roleBlurb}>{ROLE_DESCRIPTIONS[context.role]}</p>
        <p className={styles.roleNote}>
          Navigation is hidden according to role, but that is only presentation. Access is enforced by
          row-level security in the database, which cannot be bypassed from the browser.
        </p>
        <details className={styles.matrix}>
          <summary>Which roles can reach what</summary>
          <table>
            <thead>
              <tr>
                <th scope="col">Tool</th>
                <th scope="col">Roles</th>
              </tr>
            </thead>
            <tbody>
              {TILES.map((tile) => (
                <tr key={tile.screen}>
                  <th scope="row">{tile.label}</th>
                  <td>{(SCREEN_ACCESS[tile.screen] as readonly string[]).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
    </AdminShell>
  );
}
