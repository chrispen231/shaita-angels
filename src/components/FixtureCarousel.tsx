import Link from "next/link";
import MatchCard from "@/components/MatchCard";
import type { Fixture } from "@/types/fixtures";
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
          // A named region lets keyboard and screen-reader users scroll the list.
          aria-label="Recent and upcoming fixtures"
          tabIndex={0}
        >
          {rail.map((fixture) => (
            <li className={styles.slide} key={fixture.id}>
              <MatchCard fixture={fixture} headingLevel="h3" />
            </li>
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
