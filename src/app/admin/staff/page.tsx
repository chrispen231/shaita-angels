import { getAdminContext } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import StaffManager, { type StaffRow } from "./StaffManager";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const context = requireScreen(await getAdminContext(), "staff");

  const { data } = await context.supabase
    .from("staff")
    .select("id, full_name, role, bio, photo_url, photo_url_alt, sort_order, is_published, updated_at")
    .order("sort_order", { ascending: true })
    .order("full_name", { ascending: true });

  const staff: StaffRow[] = (data ?? []).map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name),
    role: String(row.role),
    bio: row.bio === null ? null : String(row.bio),
    photo_url: row.photo_url === null ? null : String(row.photo_url),
    photo_url_alt: row.photo_url_alt === null ? null : String(row.photo_url_alt),
    sort_order: Number(row.sort_order),
    is_published: Boolean(row.is_published),
    updated_at: String(row.updated_at),
  }));

  const published = staff.filter((member) => member.is_published).length;

  return (
    <AdminShell
      context={context}
      active="staff"
      title="Staff"
      description="Coaches and support staff. Cards mirror the player layout with double photos."
    >
      <ul className={styles.summary}>
        <li>
          <span className={styles.count}>{staff.length}</span>
          <span className={styles.label}>Staff</span>
        </li>
        <li>
          <span className={styles.count}>{published}</span>
          <span className={styles.label}>Published</span>
        </li>
      </ul>

      <StaffManager staff={staff} />
    </AdminShell>
  );
}
