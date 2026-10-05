import Link from "next/link";
import { getAdminContext } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import SponsorForm from "./SponsorForm";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Sponsor } from "@/types/sponsors";
import { SPONSOR_TIER_LABELS } from "@/types/sponsors";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sponsors" };

const SPONSOR_COLUMNS =
  "id, name, tier, url, logo_path, alt_text, starts_on, ends_on, sort_order, is_published, created_at, updated_at";

export default async function SponsorsPage({
  searchParams,
}: {
  searchParams: Promise<{ sponsor?: string }>;
}) {
  const context = requireScreen(await getAdminContext(), "sponsors");
  const configured = Boolean(getSupabaseConfig());
  const { sponsor: sponsorId } = await searchParams;

  let sponsors: Sponsor[] = [];
  if (configured) {
    const { data } = await context.supabase
      .from("sponsors")
      .select(SPONSOR_COLUMNS)
      .order("tier", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    sponsors = (data ?? []) as Sponsor[];
  }

  // Unknown ids fall back to the add form rather than erroring, so a stale link
  // cannot strand an admin on a broken screen.
  const selected = sponsors.find((sponsor) => sponsor.id === sponsorId) ?? null;

  return (
    <AdminShell
      context={context}
      active="sponsors"
      title="Sponsors"
      description="Tier 1 sponsors sit alone in the top row. A sponsor is hidden from the public band automatically once its contract end date passes."
    >
      {!configured && (
        <p className={styles.warning}>
          Supabase is not configured, so nothing can be saved yet. Set the environment variables and
          apply the migrations first.
        </p>
      )}

      <section className={styles.listSection}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Current sponsors</h2>
          <Link className={styles.newLink} href="/admin/sponsors">
            + Add sponsor
          </Link>
        </div>

        {sponsors.length === 0 ? (
          <p className={styles.empty}>No sponsors yet. Use the form below to add the first one.</p>
        ) : (
          <ul className={styles.list}>
            {sponsors.map((sponsor) => (
              <li key={sponsor.id}>
                <Link
                  className={styles.row}
                  href={`/admin/sponsors?sponsor=${sponsor.id}`}
                  aria-current={selected?.id === sponsor.id ? "true" : undefined}
                >
                  <span className={styles.rowName}>{sponsor.name}</span>
                  <span className={styles.rowTier}>{SPONSOR_TIER_LABELS[sponsor.tier]}</span>
                  <span className={styles.rowState} data-published={sponsor.is_published}>
                    {sponsor.is_published ? "Published" : "Hidden"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.editorSection}>
        <h2 className={styles.sectionTitle}>{selected ? `Edit ${selected.name}` : "Add a sponsor"}</h2>
        <SponsorForm key={selected?.id ?? "new"} sponsor={selected} />
      </section>
    </AdminShell>
  );
}
