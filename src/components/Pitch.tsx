import type { PublicLineupRow } from "@/lib/matches/content";

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

  if (positioned.length === 0) return null;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "640px",
        margin: "0 auto 32px",
      }}
    >
      {formation && (
        <p
          style={{
            textAlign: "center",
            fontWeight: 800,
            fontSize: "13px",
            color: "#b12632",
            marginBottom: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontFamily: "var(--body)",
          }}
        >
          {formation}
        </p>
      )}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "500px",
          background: "#2d8a3e",
          border: "2px solid rgba(255,255,255,0.25)",
          borderRadius: "4px",
          overflow: "hidden",
        }}
        role="img"
        aria-label={`${side === "shaita" ? "Shaita Angels" : "Opponent"} formation${formation ? ` (${formation})` : ""}`}
      >
        {/* Pitch markings */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "40%",
            height: "8%",
            border: "2px solid rgba(255,255,255,0.35)",
            borderTop: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "70%",
            height: "18%",
            border: "2px solid rgba(255,255,255,0.35)",
            borderTop: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: "100%",
            height: "2px",
            background: "rgba(255,255,255,0.35)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "28%",
            aspectRatio: "1",
            border: "2px solid rgba(255,255,255,0.35)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "6px",
            height: "6px",
            background: "rgba(255,255,255,0.5)",
            borderRadius: "50%",
          }}
        />

        {/* Player markers */}
        {positioned.map((player, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${player.pitch_x}%`,
              top: `${player.pitch_y}%`,
              transform: "translate(-50%, -50%)",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#b12632",
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 800,
              border: "2px solid rgba(255,255,255,0.9)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              zIndex: 1,
            }}
            title={`${player.player_name}${player.shirt_number ? ` (#${player.shirt_number})` : ""}${player.position ? ` — ${player.position}` : ""}`}
          >
            <span style={{ fontSize: "13px", fontWeight: 800 }}>
              {player.shirt_number ?? ""}
            </span>
            <span
              style={{
                fontSize: "8px",
                fontWeight: 600,
                opacity: 0.85,
                marginTop: "1px",
              }}
            >
              {player.position ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
