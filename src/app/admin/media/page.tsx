import { getAdminContext } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import MediaLibrary, { type MediaRow } from "./MediaLibrary";
import { getCompetitionsForAdmin } from "@/lib/reference-data.server";
import { builtInCompetitions, POSITIONS } from "@/lib/reference-data";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Media library" };

/**
 * Media library and competition list.
 *
 * Two tools on one screen because both are the same question asked of the admin:
 * "what can I pick from?" One browses the images already uploaded, the other edits
 * the competitions every fixture dropdown offers.
 */
export default async function MediaPage() {
  const context = requireScreen(await getAdminContext(), "media");

  const [uploads, competitions] = await Promise.all([
    context.supabase
      .from("media_uploads")
      .select("id, bucket, object_path, public_url, purpose, original_filename, uploaded_by, uploaded_at")
      .order("uploaded_at", { ascending: false })
      .limit(200),
    getCompetitionsForAdmin(),
  ]);

  const rows: MediaRow[] = (uploads.data ?? []).map((row) => ({
    id: String(row.id),
    bucket: String(row.bucket),
    object_path: String(row.object_path),
    public_url: String(row.public_url),
    purpose: String(row.purpose),
    original_filename: row.original_filename === null ? null : String(row.original_filename),
    uploaded_by: String(row.uploaded_by),
    uploaded_at: String(row.uploaded_at),
  }));

  const isSuperAdmin = context.role === "super_admin";

  return (
    <AdminShell
      context={context}
      active="media"
      title="Media library"
      description="Every image uploaded through the admin, and the competitions fixtures can be filed under."
    >
      <MediaLibrary uploads={rows} isSuperAdmin={isSuperAdmin} />

      <section className={styles.competitions}>
        <h2 className={styles.heading}>Competitions</h2>
        <p className={styles.hint}>
          These appear in the competition dropdown on every fixture. Reordering or renaming one
          changes what contributors can select, so only a super admin can edit this list.
        </p>

        {isSuperAdmin ? (
          <ol className={styles.list}>
            {competitions.map((competition) => (
              <li key={competition.slug} className={styles.row}>
                <span className={styles.name}>{competition.name}</span>
                <span className={styles.short}>{competition.short}</span>
                <code className={styles.slug}>{competition.slug}</code>
              </li>
            ))}
          </ol>
        ) : (
          <ul className={styles.list}>
            {competitions.map((competition) => (
              <li key={competition.slug} className={styles.row}>
                <span className={styles.name}>{competition.name}</span>
                <span className={styles.short}>{competition.short}</span>
              </li>
            ))}
          </ul>
        )}

        <p className={styles.note}>
          Built-in fallback list: {builtInCompetitions().map((entry) => entry.short).join(", ")}.
          Positions offered in the squad and match editors: {POSITIONS.join(", ")}.
        </p>
      </section>
    </AdminShell>
  );
}
