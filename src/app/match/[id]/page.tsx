import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Fixture } from "@/types/fixtures";
import { formatMatchDateLong, FIXTURE_COLUMNS } from "@/lib/fixtures";
import MatchView, { isMatchTab } from "./MatchView";
import { getMatchContent } from "@/lib/matches/content";

export const dynamic = "force-dynamic";

async function getFixture(id: string): Promise<Fixture | null> {
  if (!getSupabaseConfig()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fixtures")
    .select(FIXTURE_COLUMNS)
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as Fixture;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const fixture = await getFixture(id);
  if (!fixture) return { title: "Match not found" };
  return {
    title: `${fixture.opponent} · ${formatMatchDateLong(fixture.match_date)}`,
    description: `Shaita Angels vs ${fixture.opponent}, ${fixture.competition} (${fixture.season}).`,
  };
}

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const fixture = await getFixture(id);
  if (!fixture) notFound();

  // Match content is public read: the policies gate it on the fixture being
  // published, which getFixture has already established. No date_of_birth is
  // involved anywhere in this path.
  const content = await getMatchContent(id);

  return (
    <MatchView
      fixture={fixture}
      tab={isMatchTab(tab) ? tab : "lineups"}
      content={content}
    />
  );
}
