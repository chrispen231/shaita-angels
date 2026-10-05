import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { AdminContext, ScreenKey } from "@/lib/admin/roles";
import { ROLE_LABELS, SCREEN_ACCESS, canAccess } from "@/lib/admin/roles";
import styles from "./AdminShell.module.css";

/**
 * The admin section shell: a persistent sidebar with one entry per tool.
 *
 * One section rather than one long page. A single scrolling page would be
 * unnavigable and would get slower with every tool added; this keeps each tool on
 * its own focused screen while sharing one login and one visual language.
 *
 * Access control here is presentation only. The boundary is RLS plus the
 * column-level grants in the roles migration. A nav link is hidden because
 * hiding it is right, not because it is the thing standing between a content
 * admin and the sponsors table.
 */

type NavItem = {
  screen: ScreenKey;
  href: string;
  label: string;
  group: string;
};

const NAV: NavItem[] = [
  { screen: "fixtures", href: "/admin/fixtures", label: "Fixtures", group: "Matches" },
  { screen: "matches", href: "/admin/matches", label: "Matches & lineups", group: "Matches" },
  { screen: "news", href: "/admin/news", label: "News", group: "Content" },
  { screen: "squad", href: "/admin/squad", label: "Squad", group: "Content" },
  { screen: "honors", href: "/admin/honours", label: "Honours", group: "Content" },
  { screen: "media", href: "/admin/media", label: "Media library", group: "Content" },
  { screen: "sponsors", href: "/admin/sponsors", label: "Sponsors", group: "Site" },
  { screen: "settings", href: "/admin/settings", label: "Social & contact", group: "Site" },
  { screen: "users", href: "/admin/users", label: "Administrators", group: "Site" },
];

export default function AdminShell({
  context,
  active,
  title,
  description,
  actions,
  children,
}: {
  context: AdminContext;
  active?: ScreenKey;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const groups = Array.from(new Set(NAV.map((item) => item.group)));
  const visible = NAV.filter((item) => canAccess(context.role, item.screen));

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#admin-content">
        Skip to content
      </a>

      <nav className={styles.sidebar} aria-label="Admin sections">
        <div className={styles.brandBlock}>
          <Link href="/" className={styles.brand}>
            Shaita Angels
          </Link>
          <span className={styles.role}>{ROLE_LABELS[context.role]}</span>
          <span className={styles.email}>{context.user.email}</span>
        </div>

        {groups.map((group) => {
          const items = visible.filter((item) => item.group === group);
          if (items.length === 0) return null;
          return (
            <div className={styles.group} key={group}>
              <p className={styles.groupLabel}>{group}</p>
              <ul className={styles.navList}>
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      className={`${styles.navLink} ${active === item.screen ? styles.navLinkActive : ""}`}
                      href={item.href}
                      aria-current={active === item.screen ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <div className={styles.foot}>
          <Link href="/admin" className={styles.dashboardLink}>
            Dashboard
          </Link>
          <Link href="/" className={styles.dashboardLink}>
            View site
          </Link>
        </div>
      </nav>

      <div className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{ROLE_LABELS[context.role]} area</p>
            <h1 className={styles.title}>{title}</h1>
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>

        <div className={styles.content} id="admin-content">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Guard for a screen the signed-in admin may not use.
 *
 * Returns the context when access is allowed, and redirects otherwise. Callers
 * use this instead of checking `canAccess` inline, so a screen cannot forget the
 * check. This is a usability guard, not the security boundary.
 */
/**
 * Gate for an admin screen.
 *
 * A signed-in admin without the role gets a 404, not a redirect to the
 * dashboard. docs/admin-spec.md requires this: a redirect confirms the screen
 * exists and bounces the person somewhere harmless-looking, whereas a 404 is the
 * same answer a genuinely missing page gives. The distinction matters when the
 * question is "can this person see that this tool exists", which is the first
 * question of anyone probing the admin area.
 *
 * RLS is the real boundary either way - requireScreen is presentation, not
 * security. But a role check that leaks existence is still a leak.
 */
export function requireScreen(context: AdminContext | null, screen: ScreenKey): AdminContext {
  if (!context) redirect("/admin/login");
  if (!canAccess(context.role, screen)) notFound();
  return context;
}

/** Exported so the dashboard can list what the current role can reach. */
export { SCREEN_ACCESS };