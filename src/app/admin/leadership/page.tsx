import { getAdminContext } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import LeadershipManager, { type LeaderRow } from "./LeadershipManager";
import summaryStyles from "@/app/admin/staff/page.module.css";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leadership" };

export default async function LeadershipAdminPage() {
  const context = requireScreen(await getAdminContext(), "leadership");
  const { data, error } = await context.supabase
    .from("leadership")
    .select("id, full_name, role, bio, photo_url, photo_alt, sort_order, is_published")
    .order("sort_order", { ascending: true })
    .order("full_name", { ascending: true });

  const leaders: LeaderRow[] = (data ?? []).map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name),
    role: String(row.role),
    bio: row.bio === null ? null : String(row.bio),
    photo_url: row.photo_url === null ? null : String(row.photo_url),
    photo_alt: row.photo_alt === null ? null : String(row.photo_alt),
    sort_order: Number(row.sort_order),
    is_published: Boolean(row.is_published),
  }));
  const published = leaders.filter((leader) => leader.is_published).length;

  return (
    <AdminShell
      context={context}
      active="leadership"
      title="Leadership"
      description="Manage the club leadership profiles shown on the public Leadership page."
    >
      {error ? (
        <p role="alert" className={styles.notice}>
          Leadership data is unavailable. The Supabase leadership migration may need to be applied.
        </p>
      ) : (
        <>
          <ul className={summaryStyles.summary}>
            <li><span className={summaryStyles.count}>{leaders.length}</span><span className={summaryStyles.label}>Profiles</span></li>
            <li><span className={summaryStyles.count}>{published}</span><span className={summaryStyles.label}>Published</span></li>
          </ul>
          <LeadershipManager leaders={leaders} />
        </>
      )}
    </AdminShell>
  );
}
