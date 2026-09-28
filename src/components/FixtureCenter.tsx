import Image from "next/image";
import type { Fixture } from "@/types/fixtures";
import { formatKickoff, formatMatchDate } from "@/lib/fixtures";
import styles from "./FixtureCenter.module.css";

export default function FixtureCenter({ fixtures }: { fixtures: Fixture[] }) {
  const upcoming = fixtures.filter((item) => item.status !== "played").sort((a, b) => a.match_date.localeCompare(b.match_date));
  const results = fixtures.filter((item) => item.status === "played").sort((a, b) => b.match_date.localeCompare(a.match_date));
  return <div className={styles.center}>
    <section aria-labelledby="upcoming-heading"><div className={styles.heading}><p className="eyebrow">The schedule</p><h2 id="upcoming-heading">Upcoming fixtures</h2></div>
      {upcoming.length ? <div className={styles.list}>{upcoming.map((fixture) => <FixtureCard fixture={fixture} key={fixture.id} />)}</div> : <p className={styles.empty}>No upcoming fixtures have been announced.</p>}
    </section>
    <section aria-labelledby="results-heading"><div className={styles.heading}><p className="eyebrow">Full time</p><h2 id="results-heading">Results</h2></div>
      {results.length ? <div className={styles.list}>{results.map((fixture) => <FixtureCard fixture={fixture} key={fixture.id} />)}</div> : <p className={styles.empty}>No results have been published yet.</p>}
    </section>
  </div>;
}

function FixtureCard({ fixture }: { fixture: Fixture }) {
  const date = formatMatchDate(fixture.match_date);
  const kickoff = formatKickoff(fixture.kickoff_time);
  const hasScore = fixture.status === "played" && fixture.shaita_goals !== null && fixture.opponent_goals !== null;
  const crestLabel = fixture.opponent.trim().split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
  return <article className={styles.card}>
    <div className={styles.meta}><time dateTime={fixture.match_date}>{date}</time><span>{fixture.competition} · {fixture.season}</span></div>
    <div className={styles.teams}>
      <div className={styles.team}><span className={styles.clubCrest}><Image src="/shaita-angels-logo.png" alt="" width={44} height={52} /></span><strong>Shaita Angels</strong></div>
      <div className={styles.score}>{hasScore ? <><b>{fixture.shaita_goals}</b><i>–</i><b>{fixture.opponent_goals}</b></> : <span className={styles.vs}>VS</span>}{!hasScore && fixture.status !== "scheduled" && <small>{fixture.status}</small>}{!hasScore && fixture.status === "scheduled" && kickoff && <small>{kickoff} · local time</small>}</div>
      <div className={`${styles.team} ${styles.opponent}`}><span className={styles.opponentCrest}>{crestLabel || "FC"}</span><strong>{fixture.opponent}</strong></div>
    </div>
    <div className={styles.footer}><span>{fixture.venue ?? `${fixture.venue_type} fixture`}</span>{hasScore && <span>FULL TIME</span>}</div>
    {fixture.notes && <p className={styles.notes}>{fixture.notes}</p>}
  </article>;
}
