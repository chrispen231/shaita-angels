import Link from "next/link";
import type { Fixture } from "@/types/fixtures";
import MatchCard from "@/components/MatchCard";
import {
  COMPETITIONS,
  hasScore,
  matchCompetition,
  monthKey,
  monthLabel,
} from "@/lib/fixtures";
import styles from "./MatchCentre.module.css";

/**
 * The match centre: filters for month and competition, then one card per
 * fixture grouped by month, mirroring the structure club sites use so a fan can
 * answer "when is the next match?" in a couple of glances.
 *
 * Filtering is driven entirely by the URL (?period=2026-10&competition=...), so
 * a filtered view is shareable, bookmarkable, and works without JavaScript.
 */

const MONTH_PARAMS = ["period", "competition"] as const;

type Filters = { period: string | null; competition: string | null };

export default function MatchCentre({
  fixtures,
  filters,
  configured,
}: {
  fixtures: Fixture[] | null;
  filters: Filters;
  configured: boolean;
}) {
  if (fixtures === null) {
    return (
      <div className={styles.notConfigured} role="note">
        <p className="eyebrow">Match centre</p>
        <h2>Orange Cup final</h2>
        <div className={styles.staticResult}>
          <div className={styles.staticTeam}>
            <strong>Shaita Angels</strong>
          </div>
          <div className={styles.staticScore}>
            <span>2</span>
            <i>–</i>
            <span>1</span>
            <small>Full time</small>
          </div>
          <div className={styles.staticTeam}>
            <strong>World Girls</strong>
          </div>
        </div>
        <p className={styles.staticMeta}>
          2026 Women’s Orange Cup · Final — 14 July 2026 — Samuel Kanyon Doe Sports Complex, Paynesville
        </p>
        <p className={styles.notice}>
          New-season fixtures will appear here once the club confirms them. Nothing is listed before then.
        </p>
      </div>
    );
  }

  const { period, competition } = filters;

  // Which months actually contain fixtures, newest first. Only these become
  // tabs, so the filter row never offers an empty month.
  const months = Array.from(new Set(fixtures.map((f) => monthKey(f.match_date)))).sort().reverse();

  const byPeriod = period ? fixtures.filter((f) => monthKey(f.match_date) === period) : fixtures;
  const byCompetition = competition
    ? byPeriod.filter((f) => matchCompetition(f.competition) === competition)
    : byPeriod;

  // Group the survivors by month, newest month first.
  const groups = new Map<string, Fixture[]>();
  for (const fixture of [...byCompetition].sort((a, b) => b.match_date.localeCompare(a.match_date))) {
    const key = monthKey(fixture.match_date);
    const list = groups.get(key) ?? [];
    list.push(fixture);
    groups.set(key, list);
  }

  const href = (next: Partial<Filters>) => {
    const params = new URLSearchParams();
    const merged = { period, competition, ...next };
    if (merged.period) params.set("period", merged.period);
    if (merged.competition) params.set("competition", merged.competition);
    const query = params.toString();
    return query ? `/matches?${query}` : "/matches";
  };

  const anyFilter = Boolean(period || competition);

  return (
    <div className={styles.centre}>
      <nav className={styles.filters} aria-label="Filter fixtures">
        <div className={styles.filterRow}>
          <span className={styles.filterLabel} id="period-label">
            Period
          </span>
          <ul className={styles.chips} aria-labelledby="period-label">
            <li>
              <Link className={`${styles.chip} ${!period ? styles.chipActive : ""}`} href={href({ period: null })} aria-current={!period ? "true" : undefined}>
                All
              </Link>
            </li>
            {months.map((key) => (
              <li key={key}>
                <Link
                  className={`${styles.chip} ${period === key ? styles.chipActive : ""}`}
                  href={href({ period: key })}
                  aria-current={period === key ? "true" : undefined}
                >
                  {monthLabel(key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.filterRow}>
          <span className={styles.filterLabel} id="competition-label">
            Competition
          </span>
          <ul className={styles.chips} aria-labelledby="competition-label">
            <li>
              <Link className={`${styles.chip} ${!competition ? styles.chipActive : ""}`} href={href({ competition: null })} aria-current={!competition ? "true" : undefined}>
                All competitions
              </Link>
            </li>
            {COMPETITIONS.map((entry) => (
              <li key={entry.slug}>
                <Link
                  className={`${styles.chip} ${competition === entry.slug ? styles.chipActive : ""}`}
                  href={href({ competition: competition === entry.slug ? null : entry.slug })}
                  aria-current={competition === entry.slug ? "true" : undefined}
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <p className={styles.count} role="status">
        {byCompetition.length === 0
          ? "No fixtures match this filter."
          : `${byCompetition.length} ${byCompetition.length === 1 ? "fixture" : "fixtures"}${
              anyFilter ? " match this filter" : " published"
            }`}
      </p>

      {byCompetition.length > 0 ? (
        Array.from(groups.entries()).map(([key, list]) => (
          <section className={styles.monthGroup} key={key} aria-labelledby={`month-${key}`}>
            <h2 className={styles.monthHeading} id={`month-${key}`}>
              {monthLabel(key)}
              <span>
                {list.filter(hasScore).length > 0 && (
                  <span className={styles.monthSplit}>
                    {list.filter((f) => !hasScore(f)).length} to play · {list.filter(hasScore).length} played
                  </span>
                )}
              </span>
            </h2>
            <ol className={styles.grid}>
              {list.map((fixture) => (
                <li key={fixture.id} className={styles.cell}>
                  <MatchCard fixture={fixture} />
                </li>
              ))}
            </ol>
          </section>
        ))
      ) : (
        <p className={styles.empty}>
          {configured
            ? "Nothing here yet. Try a different month or competition."
            : "Fixtures appear here once the club publishes them."}
        </p>
      )}
    </div>
  );
}

export { MONTH_PARAMS };