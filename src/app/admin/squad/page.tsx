import { getAdminContext } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import SquadManager, { type SquadRow } from "./SquadManager";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Squad" };

export default async function SquadPage() {
  const context = requireScreen(await getAdminContext(), "squad");

  // date_of_birth is read here, and only here. No role has a column grant on it;
  // squad_dates_of_birth() returns it only to content editors and super admins.
  // Public pages never ask for it.
  const [{ data }, { data: birthDates, error: birthDateError }] = await Promise.all([
    context.supabase
      .from("squad")
      .select(
        "id, full_name, position, preferred_foot, height_cm, weight_kg, shirt_number, bio, photo_url, photo_url_alt, is_minor, is_published, updated_at",
      )
      .order("shirt_number", { ascending: true, nullsFirst: false })
      .order("full_name", { ascending: true }),
    context.supabase.rpc("squad_dates_of_birth"),
  ]);

  if (birthDateError) console.error("Squad date of birth read failed", birthDateError.message);
  const birthDateById = new Map(
    ((birthDates ?? []) as { id: string; date_of_birth: string | null }[]).map((row) => [
      String(row.id),
      row.date_of_birth,
    ]),
  );

  const players: SquadRow[] = (data ?? []).map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name),
    date_of_birth: birthDateById.get(String(row.id)) ?? null,
    position: row.position === null ? null : String(row.position),
    preferred_foot: row.preferred_foot === null ? null : String(row.preferred_foot),
    height_cm: row.height_cm === null ? null : Number(row.height_cm),
    weight_kg: row.weight_kg === null ? null : Number(row.weight_kg),
    shirt_number: row.shirt_number === null ? null : Number(row.shirt_number),
    bio: row.bio === null ? null : String(row.bio),
    photo_url: row.photo_url === null ? null : String(row.photo_url),
    photo_url_alt: row.photo_url_alt === null ? null : String(row.photo_url_alt),
    is_minor: Boolean(row.is_minor),
    is_published: Boolean(row.is_published),
    updated_at: String(row.updated_at),
  }));

  const published = players.filter((player) => player.is_published).length;
  const minors = players.filter((player) => player.is_minor).length;

  return (
    <AdminShell
      context={context}
      active="squad"
      title="Squad"
      description="Profiles, positions and measurements. Date of birth is stored and never published."
    >
      <ul className={styles.summary}>
        <li>
          <span className={styles.count}>{players.length}</span>
          <span className={styles.label}>Players</span>
        </li>
        <li>
          <span className={styles.count}>{published}</span>
          <span className={styles.label}>Published</span>
        </li>
        <li>
          <span className={styles.count}>{minors}</span>
          <span className={styles.label}>Under 18</span>
        </li>
      </ul>

      <SquadManager players={players} />
    </AdminShell>
  );
}
