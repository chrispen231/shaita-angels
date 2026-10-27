import Image from "next/image";
import Link from "next/link";
import type { Fixture } from "@/types/fixtures";
import {
  STATUS_LABEL,
  competitionBadge,
  formatKickoff,
  formatMatchDate,
  hasScoreline,
  opponentInitials,
  roundLabel,
} from "@/lib/fixtures";
import LiveClock from "@/components/LiveClock";
import styles from "./MatchCard.module.css";

import { ArrowUpRight } from "lucide-react";
/**
 * A single fixture, linking to its match page.
 *
 * Shared by the homepage carousel and the match centre so the two never drift
 * apart. The whole card is one link: a match is the only action it offers, and a
 * large target is easier to tap than a small chevron.
 */
export default function MatchCard({
  fixture,
  headingLevel = "h3",
}: {
  fixture: Fixture;
  headingLevel?: "h2" | "h3";
}) {
  const scored = hasScoreline(fixture);
  const isLive = fixture.status === "live";
  const kickoff = formatKickoff(fixture.kickoff_time);
  const round = roundLabel(fixture);
  const Heading = headingLevel;

  return (
    <article className={styles.card}>
      <Link
        className={styles.link}
        href={`/match/${fixture.id}`}
        aria-label={`${STATUS_LABEL[fixture.status]}: ${fixture.opponent}, ${formatMatchDate(fixture.match_date)}`}
      >
        <span className={styles.watermark} aria-hidden="true">
          {competitionBadge(fixture.competition)}
        </span>

        <div className={styles.top}>
          <span className={`${styles.tag} ${styles[fixture.status]}`}>
            {isLive && <span className={styles.pulse} aria-hidden="true" />}
            {STATUS_LABEL[fixture.status]}
            {isLive && (
              <>
                {" "}
                <LiveClock wentLiveAt={fixture.went_live_at} />
              </>
            )}
          </span>
          <time dateTime={fixture.match_date} className={styles.date}>
            {formatMatchDate(fixture.match_date)}
          </time>
        </div>

        <Heading className={styles.srOnly}>
          {fixture.opponent} {scored ? `${fixture.shaita_goals}–${fixture.opponent_goals}` : fixture.status}
        </Heading>

        <div className={styles.teams}>
          {fixture.venue_type === "away" ? (
            <>
              <div className={styles.team}>
                <span className={styles.crest} data-opponent="true">
                  {fixture.opponent_logo_url ? (
                    <Image src={fixture.opponent_logo_url} alt="" width={44} height={50} />
                  ) : (
                    opponentInitials(fixture.opponent)
                  )}
                </span>
                <strong>{fixture.opponent}</strong>
              </div>

              <div className={styles.score}>
                <span className={styles.digits}>
                  {scored ? (
                    <>
                      <b>{fixture.opponent_goals}</b>
                      <i aria-hidden="true">–</i>
                      <b>{fixture.shaita_goals}</b>
                    </>
                  ) : (
                    <span className={styles.vs}>VS</span>
                  )}
                </span>
                {scored ? (
                  <span className={styles.srOnly}>
                    {fixture.opponent} {fixture.opponent_goals}, Shaita Angels {fixture.shaita_goals}
                  </span>
                ) : (
                  kickoff && <small>{kickoff}</small>
                )}
              </div>

              <div className={`${styles.team} ${styles.away}`}>
                <span className={styles.crest} data-shaita="true">
                  <Image src="/shaita-angels-logo.png" alt="" width={44} height={50} />
                </span>
                <strong>Shaita Angels</strong>
              </div>
            </>
          ) : (
            <>
              <div className={styles.team}>
                <span className={styles.crest} data-shaita="true">
                  <Image src="/shaita-angels-logo.png" alt="" width={44} height={50} />
                </span>
                <strong>Shaita Angels</strong>
              </div>

              <div className={styles.score}>
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
                    Shaita Angels {fixture.shaita_goals}, {fixture.opponent} {fixture.opponent_goals}
                  </span>
                ) : (
                  kickoff && <small>{kickoff}</small>
                )}
              </div>

              <div className={`${styles.team} ${styles.away}`}>
                <span className={styles.crest} data-opponent="true">
                  {fixture.opponent_logo_url ? (
                    <Image src={fixture.opponent_logo_url} alt="" width={44} height={50} />
                  ) : (
                    opponentInitials(fixture.opponent)
                  )}
                </span>
                <strong>{fixture.opponent}</strong>
              </div>
            </>
          )}
        </div>

        <div className={styles.bottom}>
          <span className={styles.competition}>
            {fixture.competition} · {fixture.season}
          </span>
          {round && <span className={styles.round}>{round}</span>}
          {(fixture.venue || kickoff) && (
            <span className={styles.meta}>
              {fixture.venue ?? `${fixture.venue_type} fixture`}
              {fixture.venue && kickoff ? ` · ${kickoff}` : ""}
            </span>
          )}
        </div>

        <span className={styles.cta} aria-hidden="true">
          Match details <span><ArrowUpRight className="inline-icon" /></span>
        </span>
      </Link>
    </article>
  );
}