import Image from "next/image";
import Link from "next/link";
import type { Fixture } from "@/types/fixtures";
import {
  STATUS_LABEL,
  competitionBadge,
  daysUntil,
  formatKickoff,
  formatMatchDateLong,
  hasScore,
  matchCompetition,
  opponentInitials,
  roundLabel,
} from "@/lib/fixtures";
import {
  splitLineup,
  goalCounts,
  type MatchContent,
  type PublicLineupRow,
} from "@/lib/matches/content";
import { formatMinute, describeGoal } from "@/lib/matches/validation";
import styles from "./MatchPage.module.css";

export type MatchTab = "lineups" | "commentary" | "stats";

export const MATCH_TABS: { id: MatchTab; label: string }[] = [
  { id: "lineups", label: "Lineups" },
  { id: "commentary", label: "Commentary" },
  { id: "stats", label: "Stats" },
];

export function isMatchTab(value: string | undefined): value is MatchTab {
  return MATCH_TABS.some((tab) => tab.id === value);
}

/**
 * Presentation for a single fixture. Split from the route so it can be rendered
 * without Supabase, which keeps it verifiable and reusable.
 */
/**
 * Empty content, used when the route renders without Supabase (the test
 * harness and any preview). Keeps this component free of data access, which is
 * what makes it verifiable without a database.
 */
const NO_CONTENT: MatchContent = { lineup: [], goals: [], cards: [], report: null, isEmpty: true };

export default function MatchView({
  fixture,
  tab,
  content = NO_CONTENT,
}: {
  fixture: Fixture;
  tab: MatchTab;
  content?: MatchContent;
}) {
  const scored = hasScore(fixture);
  const kickoff = formatKickoff(fixture.kickoff_time);
  const countdown = fixture.status === "scheduled" ? daysUntil(fixture.match_date) : null;
  const round = roundLabel(fixture);
  const slug = matchCompetition(fixture.competition);

  return <div className={styles.page}>
    <div className="wrap">
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link href="/matches">← Match centre</Link>
      </nav>

      <header className={styles.header}>
        <p className={styles.badge}>{competitionBadge(fixture.competition)}</p>
        <h1 className={styles.title}>
          Shaita Angels <span className={styles.titleVs}>vs</span> {fixture.opponent}
        </h1>
        <p className={styles.competition}>
          {fixture.competition} · {fixture.season}
          {round ? ` · ${round}` : ""}
        </p>

        <div className={styles.scoreline}>
          <div className={styles.side}>
            <span className={styles.crest}>
              <Image src="/shaita-angels-logo.png" alt="" width={56} height={64} />
            </span>
            <strong>Shaita Angels</strong>
          </div>
          <div className={styles.result}>
            <span className={styles.digits}>
              {scored ? (
                <>
                  <b>{fixture.shaita_goals}</b>
                  <i aria-hidden="true">–</i>
                  <b>{fixture.opponent_goals}</b>
                </>
              ) : (
                <span className={styles.vs}>VS</span>
              )}
            </span>
            {scored ? (
              <span className={styles.srOnly}>
                Final score: Shaita Angels {fixture.shaita_goals}, {fixture.opponent} {fixture.opponent_goals}
              </span>
            ) : (
              <>
                {countdown !== null && <small>{countdown} {countdown === 1 ? "day" : "days"} to go</small>}
                {!countdown && kickoff && <small>Kick-off {kickoff}</small>}
              </>
            )}
          </div>
          <div className={`${styles.side} ${styles.away}`}>
            <span className={styles.crest} data-opponent="true">
              {opponentInitials(fixture.opponent)}
            </span>
            <strong>{fixture.opponent}</strong>
          </div>
        </div>

        <p className={styles.meta}>
          <time dateTime={fixture.match_date}>{formatMatchDateLong(fixture.match_date)}</time>
          {fixture.venue ? <span>{fixture.venue}</span> : <span>{fixture.venue_type} fixture</span>}
          {kickoff && <span>Kick-off {kickoff} local time</span>}
          <span className={`${styles.status} ${styles[fixture.status]}`}>{STATUS_LABEL[fixture.status]}</span>
        </p>
      </header>

      <nav className={styles.tabs} aria-label="Match information">
        {MATCH_TABS.map((entry) => {
          const isActive = entry.id === tab;
          return <Link
            key={entry.id}
            className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
            href={`/match/${fixture.id}?tab=${entry.id}`}
            aria-current={isActive ? "page" : undefined}
          >
            {entry.label}
          </Link>;
        })}
      </nav>

      <div className={styles.panel} role="region" aria-label={`${MATCH_TABS.find((t) => t.id === tab)?.label} for this match`}>
        {tab === "lineups" && <Lineups fixture={fixture} content={content} />}
        {tab === "commentary" && <Commentary fixture={fixture} content={content} />}
        {tab === "stats" && <Stats fixture={fixture} slug={slug} content={content} />}
      </div>

      {fixture.notes && !/round|matchweek|week/i.test(fixture.notes) && (
        <section className={styles.notes} aria-labelledby="match-notes-heading">
          <h2 id="match-notes-heading">Match notes</h2>
          <p>{fixture.notes}</p>
        </section>
      )}

      <p className={styles.back}>
        <Link className="button button-outline" href="/matches">All fixtures &amp; results</Link>
      </p>
    </div>
  </div>;
}

/**
 * Lineups, goals and cards the club entered through the admin area.
 *
 * The empty state is unchanged in spirit from the placeholder it replaces: if the
 * club has entered nothing, we say so plainly rather than showing an invented
 * eleven. Nothing on this page is generated or estimated.
 */
function Lineups({ fixture, content }: { fixture: Fixture; content: MatchContent }) {
  if (content.lineup.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>Team lineups</h2>
        <p>
          {fixture.status === "scheduled"
            ? `The starting lineups for this match will be published here by the club closer to kick-off${
                fixture.kickoff_time ? `, around ${formatKickoff(fixture.kickoff_time)}` : ""
              }.`
            : "The lineups that played in this match have not been published yet."}
        </p>
        <p className={styles.emptyMeta}>
          Lineups are added by club officials. Nothing on this page is generated or estimated.
        </p>
      </div>
    );
  }

  const { starters, bench } = splitLineup(content.lineup);

  return (
    <div className={styles.detail}>
      <PlayerGroup title="Starting lineup" rows={starters} />

      {bench.length > 0 && <PlayerGroup title="Substitutes" rows={bench} />}

      {content.goals.length > 0 && (
        <section className={styles.detailSection} aria-labelledby="match-goals-heading">
          <h2 id="match-goals-heading">Goals</h2>
          <ul className={styles.eventList}>
            {content.goals.map((goal, index) => (
              <li key={index} className={styles.event}>
                <span className={styles.eventMinute}>{formatMinute(goal.minute, goal.added_stoppage_minutes)}</span>
                <span className={styles.eventBody}>
                  <span className={styles.eventName}>{describeGoal(goal)}</span>
                  {goal.assist_note && <span className={styles.eventNote}>{goal.assist_note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {content.cards.length > 0 && (
        <section className={styles.detailSection} aria-labelledby="match-cards-heading">
          <h2 id="match-cards-heading">Cards</h2>
          <ul className={styles.eventList}>
            {content.cards.map((card, index) => (
              <li key={index} className={styles.event}>
                <span className={styles.eventMinute}>{formatMinute(card.minute, card.added_stoppage_minutes)}</span>
                <span className={styles.eventBody}>
                  <span className={styles.eventName}>{card.player_name}</span>
                  <span className={styles.eventNote}>
                    {card.card === "second_yellow" ? "Second yellow card" : `${card.card} card`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PlayerGroup({ title, rows }: { title: string; rows: PublicLineupRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section className={styles.detailSection} aria-label={title}>
      <h2>{title}</h2>
      <ul className={styles.playerList}>
        {rows.map((row, index) => (
          <li key={index} className={styles.player}>
            <span className={styles.playerNumber}>{row.shirt_number ?? ""}</span>
            <span className={styles.playerName}>{row.player_name}</span>
            {row.position && <span className={styles.playerPosition}>{row.position}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Commentary, and the written match report when the club has supplied one.
 *
 * Live minute-by-minute commentary still needs a match-data feed the club does
 * not have, so this panel shows the written report and stays honest about the
 * rest rather than showing a timeline of nothing.
 */
function Commentary({ fixture, content }: { fixture: Fixture; content: MatchContent }) {
  if (content.report) {
    return (
      <div className={styles.detail}>
        <section className={styles.detailSection} aria-labelledby="match-report-heading">
          <h2 id="match-report-heading">Match report</h2>
          {content.report.split(/\n\s*\n/).map((paragraph, index) => (
            <p key={index} className={styles.reportParagraph}>
              {paragraph}
            </p>
          ))}
        </section>
      </div>
    );
  }

  if (fixture.status !== "played") {
    return (
      <div className={styles.empty}>
        <h2>Commentary</h2>
        <p>
          Commentary appears here once a match is under way. This fixture is{" "}
          {STATUS_LABEL[fixture.status].toLowerCase()}, so there is nothing to report yet.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.empty}>
      <h2>Commentary</h2>
      <p>
        Match commentary is not available for this fixture. The club has not published a report for
        this {competitionBadge(fixture.competition).toLowerCase()} match.
      </p>
      <p className={styles.emptyMeta}>
        A written match report will appear here once one is supplied and confirmed by the club.
      </p>
    </div>
  );
}

/**
 * Statistics, derived from what the club actually recorded for this match.
 *
 * Only counts that follow from entered data appear: goals by side, cards, and
 * per-player totals. Possession, shots and pass accuracy are not here, because
 * the club does not record them and inventing them would be worse than leaving
 * them out. The scoreline stays the authority on the result; these numbers are
 * read from the same goals the editor saved.
 */
function Stats({
  fixture,
  slug,
  content,
}: {
  fixture: Fixture;
  slug: string | null;
  content: MatchContent;
}) {
  const counts = goalCounts(content.goals);
  const yellow = content.cards.filter((card) => card.card === "yellow").length;
  const secondYellow = content.cards.filter((card) => card.card === "second_yellow").length;
  const red = content.cards.filter((card) => card.card === "red").length;

  const scorers = new Map<string, { goals: number; minutes: number[] }>();
  for (const goal of content.goals) {
    // Own goals are not credited to a player in the scoring table: they are
    // against them. Listing them as goals would misstate a player's record.
    if (goal.is_own_goal) continue;
    const entry = scorers.get(goal.player_name) ?? { goals: 0, minutes: [] };
    entry.goals += 1;
    entry.minutes.push(goal.minute);
    scorers.set(goal.player_name, entry);
  }

  const hasRecorded = content.goals.length > 0 || content.cards.length > 0;

  return (
    <div className={styles.detail}>
      <section className={styles.detailSection} aria-labelledby="match-stats-heading">
        <h2 id="match-stats-heading">Statistics</h2>

        {!hasRecorded ? (
          <p className={styles.emptyMeta}>
            Detailed statistics for this {slug === "womens-orange-cup" ? "cup" : "league"} match are
            not available yet. They will be published here once the club records them.
          </p>
        ) : (
          <dl className={styles.stats}>
            <div>
              <dt>Shaita goals</dt>
              <dd>{counts.shaita}</dd>
            </div>
            <div>
              <dt>Opponent goals</dt>
              <dd>{counts.opponent}</dd>
            </div>
            <div>
              <dt>Yellow cards</dt>
              <dd>{yellow + secondYellow}</dd>
            </div>
            <div>
              <dt>Red cards</dt>
              <dd>{red}</dd>
            </div>
          </dl>
        )}

        {scorers.size > 0 && (
          <div className={styles.scorers}>
            <h3>Goalscorers</h3>
            <ul className={styles.playerList}>
              {[...scorers.entries()].map(([name, entry]) => (
                <li key={name} className={styles.player}>
                  <span className={styles.playerName}>{name}</span>
                  <span className={styles.playerPosition}>
                    {entry.goals} {entry.goals === 1 ? "goal" : "goals"}
                    {entry.minutes.length > 0 && ` (${entry.minutes.map((m) => `${m}'`).join(", ")})`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className={styles.detailSection} aria-labelledby="match-facts-heading">
        <h2 id="match-facts-heading">Match facts</h2>
        <dl className={styles.facts}>
          <div>
            <dt>Competition</dt>
            <dd>{fixture.competition}</dd>
          </div>
          <div>
            <dt>Season</dt>
            <dd>{fixture.season}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{STATUS_LABEL[fixture.status]}</dd>
          </div>
          <div>
            <dt>Venue</dt>
            <dd>{fixture.venue ?? `${fixture.venue_type} fixture`}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
