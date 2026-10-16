import type { PublicLineupRow } from "@/lib/matches/content";
import styles from "./Pitch.module.css";

/**
 * A football pitch diagram showing player positions.
 *
 * Renders a vertical pitch (goal at top, halfway line in the middle) with player
 * markers positioned by their pitch_x/pitch_y coordinates. The pitch is drawn
 * with CSS borders and pseudo-elements for the markings — no images, no canvas,
 * so it scales cleanly and works without JavaScript for the structure.
 *
 * Players are shown as circles with their shirt number and position code.
 * The component is presentational only; all data comes from the club's lineup
 * entries via the admin pitch editor.
 */
export default function Pitch({
  players,
  formation,
  side = "shaita",
}: {
  players: PublicLineupRow[];
  formation: string | null;
  side?: "shaita" | "opponent";
}) {
  // Only show players with both coordinates set.
  const positioned = players.filter(
    (p) => p.pitch_x !== null && p.pitch_y !== null,
  );

  if (positioned.length === 0) {
    return (
      <div className={styles.pitchWrap}>
        {formation && <p className={styles.formationLabel}>{formation}</p>}
        <div className={styles.pitchEmpty}>
          <p>Set pitch coordinates in the match editor to see the formation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pitchWrap} aria-label={`${side === "shaita" ? "Shaita Angels" : "Opponent"} formation${formation ? ` (${formation})` : ""}`}>
      {formation && <p className={styles.formationLabel}>{formation}</p>}
      <div className={styles.pitch}>
        {/* Pitch markings */}
        <div className={styles.goalArea} aria-hidden="true" />
        <div className={styles.penaltyArea} aria-hidden="true" />
        <div className={styles.halfwayLine} aria-hidden="true" />
        <div className={styles.centerCircle} aria-hidden="true" />
        <div className={styles.centerSpot} aria-hidden="true" />

        {/* Player markers */}
        {positioned.map((player, index) => (
          <div
            key={index}
            className={styles.player}
            style={{
              left: `${player.pitch_x}%`,
              top: `${player.pitch_y}%`,
            }}
            title={`${player.player_name}${player.shirt_number ? ` (#${player.shirt_number})` : ""}${player.position ? ` — ${player.position}` : ""}`}
          >
            <span className={styles.playerNumber}>
              {player.shirt_number ?? ""}
            </span>
            <span className={styles.playerPosition}>
              {player.position ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
