import { getAdminContext } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import type { ScreenKey } from "@/lib/admin/roles";
import styles from "./page.module.css";

/**
 * Placeholder for a tool that is not built yet.
 *
 * Renders the shell with the correct role guard, so the nav link resolves and a
 * non-permitted admin is redirected exactly as they would be on the real screen.
 * The point is that no nav entry is dead and no screen lies about existing.
 */
export function PlaceholderScreen({
  screen,
  title,
  phase,
  description,
  comingNext,
}: {
  screen: ScreenKey;
  title: string;
  phase: string;
  description: string;
  comingNext: string;
}) {
  return async function Placeholder() {
    const context = requireScreen(await getAdminContext(), screen);

    return (
      <AdminShell context={context} active={screen} title={title} description={description}>
        <div className={styles.placeholder}>
          <p className={styles.phase}>{phase}</p>
          <h2 className={styles.placeholderTitle}>Not built yet</h2>
          <p className={styles.body}>
            This screen is part of the admin plan but has not been implemented. It is wired into the
            navigation and the role guard now, so nothing is a dead link and access control already
            applies.
          </p>
          <p className={styles.body}>
            <strong>When it lands:</strong> {comingNext}
          </p>
        </div>
      </AdminShell>
    );
  };
}