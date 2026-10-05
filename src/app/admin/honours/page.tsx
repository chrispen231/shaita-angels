import { getAdminContext } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import HonorsManager, { type HonorRow } from "./HonorsManager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Honours" };

export default async function HonorsAdminPage() {
  const context = requireScreen(await getAdminContext(), "honors");

  const { data } = await context.supabase
    .from("honors")
    .select("id, year_label, name, detail, is_published")
    .order("sort_order", { ascending: true });

  const honors: HonorRow[] = (data ?? []).map((row) => ({
    id: String(row.id),
    year_label: String(row.year_label),
    name: String(row.name),
    detail: row.detail === null ? null : String(row.detail),
    is_published: Boolean(row.is_published),
  }));

  return (
    <AdminShell
      context={context}
      active="honors"
      title="Honours"
      description="Trophies and achievements, in the order they appear on the club page."
    >
      <HonorsManager honors={honors} />
    </AdminShell>
  );
}
