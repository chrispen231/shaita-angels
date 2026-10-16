import type { PublicLineupRow } from "@/lib/matches/content";

/**
 * A football pitch diagram showing player positions.
 *
 * Renders a horizontal pitch with player markers positioned by their
 * pitch_x/pitch_y coordinates. The pitch direction follows the venue:
 * home = left to right, away = right to left.
 *
 * The Shaita Angels crest is watermarked in the centre. Player names
 * appear below each marker rather than only on hover.
 */
export default function Pitch({
  players,
  formation,
  venueType = "home",
  side = "shaita",
}: {
  players: PublicLineupRow[];
  formation: string | null;
  venueType?: "home" | "away" | "neutral";
  side?: "shaita" | "opponent";
}) {
  const positioned = players.filter(
    (p): p is PublicLineupRow & { pitch_x: number; pitch_y: number } =>
      p.pitch_x !== null && p.pitch_y !== null,
  );

  if (positioned.length === 0) return null;

  // When Shaita are away, their goal is on the right, so the pitch is
  // mirrored: a player at pitch_x 20 (left side at home) is at 80 away.
  const flip = venueType === "away";
  const displayX = (x: number) => (flip ? 100 - x : x);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "900px",
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
          aspectRatio: "105 / 68",
          background: "#2d8a3e",
          border: "2px solid rgba(255,255,255,0.25)",
          borderRadius: "4px",
          overflow: "hidden",
        }}
        role="img"
        aria-label={`${side === "shaita" ? "Shaita Angels" : "Opponent"} formation${formation ? ` (${formation})` : ""}`}
      >
        {/* Shaita crest watermark */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "120px",
            height: "120px",
            backgroundImage: "url('/shaita-angels-logo.png')",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            opacity: 0.12,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Pitch markings — horizontal orientation */}
        {/* Left goal area */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            transform: "translateY(-50%)",
            width: "8%",
            height: "40%",
            border: "2px solid rgba(255,255,255,0.35)",
            borderLeft: "none",
          }}
        />
        {/* Left penalty area */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            transform: "translateY(-50%)",
            width: "18%",
            height: "70%",
            border: "2px solid rgba(255,255,255,0.35)",
            borderLeft: "none",
          }}
        />
        {/* Right goal area */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: 0,
            transform: "translateY(-50%)",
            width: "8%",
            height: "40%",
            border: "2px solid rgba(255,255,255,0.35)",
            borderRight: "none",
          }}
        />
        {/* Right penalty area */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: 0,
            transform: "translateY(-50%)",
            width: "18%",
            height: "70%",
            border: "2px solid rgba(255,255,255,0.35)",
            borderRight: "none",
          }}
        />
        {/* Halfway line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            width: "2px",
            height: "100%",
            background: "rgba(255,255,255,0.35)",
          }}
        />
        {/* Center circle */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "18%",
            aspectRatio: "1",
            border: "2px solid rgba(255,255,255,0.35)",
            borderRadius: "50%",
          }}
        />
        {/* Center spot */}
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

        {/* Player markers with names below */}
        {positioned.map((player, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${displayX(player.pitch_x)}%`,
              top: `${player.pitch_y}%`,
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#b12632",
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 800,
                border: "2px solid rgba(255,255,255,0.9)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                lineHeight: 1.1,
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 800 }}>
                {player.shirt_number ?? ""}
              </span>
              <span
                style={{
                  fontSize: "7px",
                  fontWeight: 600,
                  opacity: 0.85,
                }}
              >
                {player.position ?? ""}
              </span>
            </div>
            <span
              style={{
                marginTop: "4px",
                fontSize: "9px",
                fontWeight: 600,
                color: "white",
                textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                whiteSpace: "nowrap",
                maxWidth: "80px",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {player.player_name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
