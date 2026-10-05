import { getAdminContext, ROLES, type Role } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import UserManager, { type AdminRow } from "./UserManager";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Administrators" };

export default async function UsersPage() {
  const context = requireScreen(await getAdminContext(), "users");

  const { data } = await context.supabase
    .from("site_admins")
    .select("email, role, created_at")
    .order("created_at", { ascending: true });

  const admins: AdminRow[] = (data ?? [])
    .map((row) => ({
      email: String(row.email),
      role: (ROLES as readonly string[]).includes(String(row.role))
        ? (row.role as Role)
        : "content",
      created_at: String(row.created_at ?? ""),
    }))
    .sort((a, b) => a.email.localeCompare(b.email));

  const counts = ROLES.map((role) => ({
    role,
    count: admins.filter((admin) => admin.role === role).length,
  }));

  return (
    <AdminShell
      context={context}
      active="users"
      title="Administrators"
      description="Super admin only. Roles decide which tools each person can reach."
    >
      <ul className={styles.summary}>
        {counts.map((entry) => (
          <li key={entry.role}>
            <span className={styles.count}>{entry.count}</span>
            <span className={styles.role}>{entry.role.replace("_", " ")}</span>
          </li>
        ))}
      </ul>

      <UserManager admins={admins} currentEmail={context.user.email} />
    </AdminShell>
  );
}
