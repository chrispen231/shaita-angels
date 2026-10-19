import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Handshake,
  Images,
  Newspaper,
  Settings2,
  ShieldCheck,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getAdminContext } from "@/lib/admin/roles";
import AdminShell from "@/app/admin/AdminShell";
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

type Tile = { screen: ScreenKey; href: string; label: string; blurb: string; icon: LucideIcon };

const TILES: Tile[] = [
  { screen: "fixtures", href: "/admin/fixtures", label: "Fixtures", blurb: "Add and edit the match list.", icon: CalendarDays },
  {
    screen: "matches",
    href: "/admin/matches",
    label: "Matches & lineups",
    blurb: "Lineups, goals, cards and reports.",
    icon: ClipboardList,
  },
  { screen: "news", href: "/admin/news", label: "News", blurb: "Stories and announcements.", icon: Newspaper },
  { screen: "squad", href: "/admin/squad", label: "Squad", blurb: "Players, numbers and photos.", icon: Users },
  { screen: "leadership", href: "/admin/leadership", label: "Leadership", blurb: "Club leaders, bios and portraits.", icon: ShieldCheck },
  { screen: "honors", href: "/admin/honours", label: "Honours", blurb: "Trophies and milestones.", icon: Trophy },
  { screen: "media", href: "/admin/media", label: "Media library", blurb: "Images used across the site.", icon: Images },
  { screen: "sponsors", href: "/admin/sponsors", label: "Sponsors", blurb: "The band above the footer.", icon: Handshake },
  {
    screen: "settings",
    href: "/admin/settings",
    label: "Social & contact",
    blurb: "Social links and contact details.",
    icon: Settings2,
  },
  { screen: "users", href: "/admin/users", label: "Administrators", blurb: "Who can manage this site.", icon: ShieldCheck },
];

type DashboardMetric = { label: string; value: number; href: string; icon: LucideIcon };

async function readMetric(
  label: string,
  href: string,
  icon: LucideIcon,
  query: PromiseLike<{ count: number | null; error: unknown }>,
): Promise<DashboardMetric | null> {
  const { count, error } = await query;
  return error ? null : { label, value: count ?? 0, href, icon };
}

export default async function AdminPage() {
  const context = await getAdminContext();
  if (!context) redirect("/admin/login");
  const available = TILES.filter((tile) => canAccess(context.role, tile.screen));

  const metricJobs: Promise<DashboardMetric | null>[] = [];
  if (canAccess(context.role, "fixtures")) {
    metricJobs.push(readMetric("Fixtures", "/admin/fixtures", CalendarDays,
      context.supabase.from("fixtures").select("id", { count: "exact", head: true })));
  }
  if (canAccess(context.role, "news")) {
    metricJobs.push(readMetric("Stories", "/admin/news", Newspaper,
      context.supabase.from("articles").select("id", { count: "exact", head: true })));
  }
  if (canAccess(context.role, "squad")) {
    metricJobs.push(readMetric("Players", "/admin/squad", Users,
      context.supabase.from("squad").select("id", { count: "exact", head: true })));
  }
  if (canAccess(context.role, "staff")) {
    metricJobs.push(readMetric("Staff", "/admin/staff", Users,
      context.supabase.from("staff").select("id", { count: "exact", head: true })));
  }
  if (canAccess(context.role, "leadership")) {
    metricJobs.push(readMetric("Leaders", "/admin/leadership", ShieldCheck,
      context.supabase.from("leadership").select("id", { count: "exact", head: true })));
  }
  if (canAccess(context.role, "sponsors")) {
    metricJobs.push(readMetric("Sponsors", "/admin/sponsors", Handshake,
      context.supabase.from("sponsors").select("id", { count: "exact", head: true })));
  }
  const metrics = (await Promise.all(metricJobs)).filter((item): item is DashboardMetric => item !== null);
  const quickActions = [
    { screen: "fixtures" as const, label: "Add a fixture", href: "/admin/fixtures", icon: CalendarDays },
    { screen: "news" as const, label: "Write a story", href: "/admin/news", icon: Newspaper },
    { screen: "leadership" as const, label: "Add a leader", href: "/admin/leadership", icon: Users },
  ].filter((item) => canAccess(context.role, item.screen));

  return (
    <AdminShell
      context={context}
      title="Dashboard"
      description={`Your ${ROLE_LABELS[context.role].toLowerCase()} workspace, with access to ${available.length} club tools.`}
    >
      {metrics.length > 0 && (
        <section className={styles.stats} aria-label="Workspace totals">
          {metrics.map(({ label, value, href, icon: Icon }) => (
            <Link className={styles.stat} href={href} key={label}>
              <span className={styles.statIcon}><Icon size={18} aria-hidden="true" /></span>
              <span className={styles.statValue}>{value}</span>
              <span className={styles.statLabel}>{label}</span>
            </Link>
          ))}
        </section>
      )}

      {quickActions.length > 0 && (
        <section className={styles.quickSection} aria-labelledby="quick-actions-heading">
          <h2 className={styles.sectionTitle} id="quick-actions-heading">Quick actions</h2>
          <div className={styles.quickActions}>
            {quickActions.map(({ href, label, icon: Icon }) => (
              <Link className={styles.quickAction} href={href} key={href}>
                <Icon size={17} aria-hidden="true" /><span>{label}</span><ArrowRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className={styles.sectionTitle}>Your tools</h2>
        <ul className={styles.tiles}>
          {available.map(({ icon: Icon, ...tile }) => (
            <li key={tile.href}>
              <Link className={styles.tile} href={tile.href}>
                <span className={styles.tileIcon}><Icon size={19} aria-hidden="true" /></span>
                <span className={styles.tileLabel}>{tile.label}</span>
                <span className={styles.tileBlurb}>{tile.blurb}</span>
                <ArrowRight className={styles.tileArrow} size={16} aria-hidden="true" />
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
