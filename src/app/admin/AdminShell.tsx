import { notFound, redirect } from "next/navigation";
import type { AdminContext, ScreenKey } from "@/lib/admin/roles";
import { ROLE_LABELS, canAccess } from "@/lib/admin/roles";
import AdminSidebar from "./AdminSidebar";
import styles from "./AdminShell.module.css";

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
  return (
    <div className={`${styles.shell} admin-shell`}>
      <a className={styles.skipLink} href="#admin-content">Skip to admin content</a>
      <AdminSidebar role={context.role} email={context.user.email} active={active} />

      <div className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{ROLE_LABELS[context.role]} workspace</p>
            <h1 className={styles.title}>{title}</h1>
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>

        <div className={styles.content} id="admin-content" tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** A screen guard; RLS remains the actual data access boundary. */
export function requireScreen(context: AdminContext | null, screen: ScreenKey): AdminContext {
  if (!context) redirect("/admin/login");
  if (!canAccess(context.role, screen)) notFound();
  return context;
}

export { SCREEN_ACCESS } from "@/lib/admin/role-constants";
