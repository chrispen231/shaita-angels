import Image from "next/image";
import Link from "next/link";
import type { Fixture } from "@/types/fixtures";
import { formatKickoff, formatMatchDate } from "@/lib/fixtures";
import styles from "./FixtureCarousel.module.css";

/**
 * Homepage fixture carousel.
 *
 * A horizontally scrollable rail of match cards, following the pattern clubs
 * use to answer "when is the next match?" at a glance. Built on native CSS
 * scroll-snap rather than a JS carousel: no client bundle, works without
 * JavaScript, and keeps keyboard and touch scrolling native.
 *
 * Renders nothing when there is no published fixture, so the homepage can drop
 * the section rather than showing an empty rail.
 */
export default function FixtureCarousel({ fixtures }: { fixtures: Fixture[] }) {
  const rail = orderFixtures(fixtures).slice(0, 8);
  if (rail.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="fixture-rail-heading">
      <div className={`wrap ${styles.head}`}>
        <div>
          <p className="eyebrow">On the road &amp; at home</p>
          <h2 id="fixture-rail-heading">Fixtures &amp; results</h2>
        </div>
        <Link className={styles.allLink} href="/matches">
          Match centre <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <div className={styles.railWrap}>
        <ul
          className={styles.rail}
          // A named region lets keyboard and screen-reader users jump the list.
          aria-label="Recent and upcoming fixtures"
          tabIndex={0}
        >
          {rail.map((fixture) => (
            <FixtureSlide fixture={fixture} key={fixture.id} />
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Next matches first, then the most recent results, so a fan opening the site
 * sees the next thing worth showing up for rather than last season's score.
 */
export function orderFixtures(fixtures: Fixture[]): Fixture[] {
  const bySoonest = (a: Fixture, b: Fixture) => a.match_date.localeCompare(b.match_date);
  const byMostRecent = (a: Fixture, b: Fixture) => b.match_date.localeCompare(a.match_date);

  const upcoming = fixtures.filter((f) => f.status !== "played").sort(bySoonest);
  const played = fixtures.filter((f) => f.status === "played").sort(byMostRecent);

  // Interleave so the rail does not read as a wall of past results once a
  // season is under way: next match, latest result, next match, ...
  const mixed: Fixture[] = [];
  for (let i = 0; i < Math.max(upcoming.length, played.length); i += 1) {
    if (upcoming[i]) mixed.push(upcoming[i]);
    if (played[i]) mixed.push(played[i]);
  }
  return mixed;
}

const STATUS_LABEL: Record<Fixture["status"], string> = {
  scheduled: "Upcoming",
  played: "Full time",
  postponed: "Postponed",
  cancelled: "Cancelled",
};

function FixtureSlide({ fixture }: { fixture: Fixture }) {
  const hasScore =
    fixture.status === "played" &&
    fixture.shaita_goals !== null &&
    fixture.opponent_goals !== null;
  const kickoff = formatKickoff(fixture.kickoff_time);
  const opponentInitials =
    fixture.opponent.trim().split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase() || "FC";

  // The competition name doubles as the card's watermark, so a fan can read the
  // context of a scoreline without a separate label.
  const watermark = fixture.competition.replace(/[·–—]/g, " ").trim().split(/\s+/).slice(0, 3).join(" ");

  return (
    <li className={styles.slide}>
      <article className={styles.card}>
        <span className={styles.watermark} aria-hidden="true">
          {watermark}
        </span>

        <div className={styles.meta}>
          <span className={`${styles.tag} ${styles[fixture.status]}`}>{STATUS_LABEL[fixture.status]}</span>
          <time dateTime={fixture.match_date}>{formatMatchDate(fixture.match_date)}</time>
        </div>

        <div className={styles.teams}>
          <div className={styles.team}>
            <span className={styles.crest}>
              <Image src="/shaita-angels-logo.png" alt="" width={40} height={46} />
            </span>
            <strong>Shaita Angels</strong>
          </div>

          <div className={styles.score}>
            {hasScore ? (
              <>
                <b>{fixture.shaita_goals}</b>
                <i aria-hidden="true">–</i>
                <b>{fixture.opponent_goals}</b>
                <span className="sr-only">
                  Shaita Angels {fixture.shaita_goals}, {fixture.opponent} {fixture.opponent_goals}
                </span>
              </>
            ) : (
              <>
                <span className={styles.vs}>VS</span>
                {kickoff && <small>{kickoff}</small>}
              </>
            )}
          </div>

          <div className={`${styles.team} ${styles.opponent}`}>
            <span className={styles.crest} data-opponent="true">
              {opponentInitials}
            </span>
            <strong>{fixture.opponent}</strong>
          </div>
        </div>

        <div className={styles.foot}>
          <span className={styles.competition}>
            {fixture.competition} · {fixture.season}
          </span>
          {fixture.venue && <span className={styles.venue}>{fixture.venue}</span>}
        </div>
      </article>
    </li>
  );
}