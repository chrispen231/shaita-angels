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
export default function MatchView({ fixture, tab }: { fixture: Fixture; tab: MatchTab }) {
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
            {scored ? (
              <>
                <b>{fixture.shaita_goals}</b>
                <i aria-hidden="true">–</i>
                <b>{fixture.opponent_goals}</b>
                <span className={styles.srOnly}>
                  Final score: Shaita Angels {fixture.shaita_goals}, {fixture.opponent} {fixture.opponent_goals}
                </span>
              </>
            ) : (
              <>
                <span className={styles.vs}>VS</span>
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
        {tab === "lineups" && <Lineups fixture={fixture} />}
        {tab === "commentary" && <Commentary fixture={fixture} />}
        {tab === "stats" && <Stats fixture={fixture} slug={slug} />}
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
 * Lineups are entered by the club through the admin area, which is built in a
 * later pass. Until a lineup exists for a match we say so plainly rather than
 * showing an invented eleven.
 */
function Lineups({ fixture }: { fixture: Fixture }) {
  return <div className={styles.empty}>
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
  </div>;
}

/**
 * Commentary requires a live match-data feed the club does not yet have. The
 * panel is honest about that instead of showing a timeline of nothing.
 */
function Commentary({ fixture }: { fixture: Fixture }) {
  if (fixture.status !== "played") {
    return <div className={styles.empty}>
      <h2>Commentary</h2>
      <p>
        Commentary appears here once a match is under way. This fixture is{" "}
        {STATUS_LABEL[fixture.status].toLowerCase()}, so there is nothing to report yet.
      </p>
    </div>;
  }

  return <div className={styles.empty}>
    <h2>Commentary</h2>
    <p>
      Match commentary is not available for this fixture. The club has not published a report for this
      {" "}{competitionBadge(fixture.competition).toLowerCase()} match.
    </p>
    <p className={styles.emptyMeta}>
      A written match report will appear here once one is supplied and confirmed by the club.
    </p>
  </div>;
}

/**
 * Statistics need per-match player and team data, which the site does not store
 * yet. Rather than derive misleading aggregates from a scoreline, this panel
 * explains what will be here.
 */
function Stats({ fixture, slug }: { fixture: Fixture; slug: string | null }) {
  return <div className={styles.empty}>
    <h2>Statistics</h2>
    <p>
      Detailed statistics for this {slug === "womens-orange-cup" ? "cup" : "league"} match are not available
      yet. They will be published here once the club records them.
    </p>
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
  </div>;
}