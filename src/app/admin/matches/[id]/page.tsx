import { notFound } from "next/navigation";
import { getAdminContext } from "@/lib/admin/roles";
import AdminShell, { requireScreen } from "@/app/admin/AdminShell";
import MatchEditor, {
  type LineupRow,
  type GoalRow,
  type CardRow,
} from "./MatchEditor";
import { CARD_TYPES, SIDES, type CardType, type Side } from "@/lib/matches/validation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Match editor" };

/** Row shapes come back from PostgREST as untyped JSON, so validate the enums. */
function toSide(value: unknown): Side {
  return (SIDES as readonly unknown[]).includes(value) ? (value as Side) : "shaita";
}

function toCard(value: unknown): CardType {
  return (CARD_TYPES as readonly unknown[]).includes(value) ? (value as CardType) : "yellow";
}

export default async function MatchEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = requireScreen(await getAdminContext(), "matches");
  const { id } = await params;

  const { data: fixture } = await context.supabase
    .from("fixtures")
    .select("id, opponent, match_date, competition, status, is_published")
    .eq("id", id)
    .maybeSingle();

  // A content admin who guesses this URL must not learn whether a fixture exists.
  // notFound rather than redirect, and before any match content is read.
  if (!fixture) notFound();

  const [lineup, goals, cards, report, squad] = await Promise.all([
    context.supabase
      .from("lineups")
      .select("player_name, shirt_number, position, is_starter, sort_order")
      .eq("fixture_id", id)
      .order("is_starter", { ascending: false })
      .order("sort_order", { ascending: true }),
    context.supabase
      .from("match_goals")
      .select("player_name, side, minute, added_stoppage_minutes, is_own_goal, assist_note, sort_order")
      .eq("fixture_id", id)
      .order("minute", { ascending: true }),
    context.supabase
      .from("match_cards")
      .select("player_name, side, card, minute, added_stoppage_minutes, sort_order")
      .eq("fixture_id", id)
      .order("minute", { ascending: true }),
    context.supabase.from("match_reports").select("body").eq("fixture_id", id).maybeSingle(),
    context.supabase.from("squad").select("full_name").order("full_name"),
  ]);

  const lineupRows: LineupRow[] = (lineup.data ?? []).map((row, index) => ({
    player_name: String(row.player_name),
    shirt_number: row.shirt_number === null ? null : Number(row.shirt_number),
    position: row.position === null ? "" : String(row.position),
    is_starter: Boolean(row.is_starter),
    sort_order: index,
  }));

  const goalRows: GoalRow[] = (goals.data ?? []).map((row, index) => ({
    player_name: String(row.player_name),
    side: toSide(row.side),
    minute: Number(row.minute),
    added_stoppage_minutes: Boolean(row.added_stoppage_minutes),
    is_own_goal: Boolean(row.is_own_goal),
    assist_note: row.assist_note === null ? "" : String(row.assist_note),
    sort_order: index,
  }));

  const cardRows: CardRow[] = (cards.data ?? []).map((row, index) => ({
    player_name: String(row.player_name),
    side: toSide(row.side),
    card: toCard(row.card),
    minute: Number(row.minute),
    added_stoppage_minutes: Boolean(row.added_stoppage_minutes),
    sort_order: index,
  }));

  return (
    <AdminShell
      context={context}
      active="matches"
      title={`${fixture.opponent}`}
      description={`${fixture.competition} — ${fixture.match_date}${
        fixture.is_published ? "" : " (unpublished)"
      }`}
    >
      <MatchEditor
        fixtureId={fixture.id}
        opponent={fixture.opponent}
        lineup={lineupRows}
        goals={goalRows}
        cards={cardRows}
        report={report.data?.body ? String(report.data.body) : ""}
        squadNames={(squad.data ?? []).map((row) => String(row.full_name))}
      />
    </AdminShell>
  );
}
