"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { pad, singular } from "@/lib/format";
import type { SquadPlayer } from "@/lib/content";
import { playerPhotos } from "@/data/site";

/**
 * Squad grid with position filters.
 *
 * Presentational: the player list and the available positions arrive as props from
 * the server component, which reads them from the database. This component stays a
 * client component only because the filter is interactive state.
 *
 * Player photographs stay bundled in src/data/site.ts rather than moving to the
 * database in this phase. They are a fixed set of image assets tied to files in
 * public/players, and the media library in Phase 5 is where uploaded imagery
 * belongs. A player added without a photo gets the shirt artwork, which is the
 * existing behaviour and reads as deliberate rather than broken.
 */

export default function SquadGrid({
  players,
  positions,
}: {
  players: SquadPlayer[];
  positions: string[];
}) {
  const [active, setActive] = useState("All");
  const filters = ["All", ...positions];
  const visiblePlayers =
    active === "All" ? players : players.filter((player) => player.position === active);

  return (
    <>
      <div className="squad-filter-bar">
        <div className="squad-filters" role="group" aria-label="Filter players by position">
          {filters.map((filter) => (
            <button
              className={active === filter ? "is-active" : ""}
              type="button"
              key={filter}
              aria-pressed={active === filter}
              onClick={() => setActive(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        <span className="squad-count" aria-live="polite">
          {visiblePlayers.length} players
        </span>
      </div>
      <div className="squad-cards">
        {visiblePlayers.map((player) => {
          const photos = playerPhotos[player.name] ?? [];
          return (
            <Link
              className="player-card"
              href={`/team/player/${player.number}`}
              key={player.number}
              aria-label={`${player.name}, number ${player.number}, ${singular(player.position)}. View player profile`}
            >
              <div className="player-card-art">
                {photos.length > 0 ? (
                  <div className={`player-photo-set ${photos.length > 1 ? "has-alternate" : ""}`}>
                    <Image
                      className="player-photo player-photo-primary"
                      src={photos[0]}
                      alt={`${player.name} in Shaita Angels colours`}
                      fill
                      priority={player.number === 2}
                      sizes="(max-width: 680px) 50vw, (max-width: 1000px) 33vw, 25vw"
                    />
                    {photos[1] && (
                      <Image
                        className="player-photo player-photo-alternate"
                        src={photos[1]}
                        alt={`${player.name}, alternate portrait`}
                        fill
                        sizes="(max-width: 680px) 50vw, (max-width: 1000px) 33vw, 25vw"
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <span className="player-art-face player-art-front" aria-hidden="true">
                      <span className="player-art-kicker">SHAITA ANGELS FC</span>
                      <span className="player-shirt">
                        <Image src="/shaita-angels-logo.png" alt="" width={42} height={42} />
                      </span>
                      <strong className="player-art-number">{pad(player.number)}</strong>
                      <span className="player-art-mark">CAREYSBURG · LIBERIA</span>
                    </span>
                    <span className="player-art-face player-art-reverse" aria-hidden="true">
                      <span className="player-art-kicker">
                        THE ANGELS · {player.position.toUpperCase()}
                      </span>
                      <span className="player-shirt player-shirt-back">
                        <span>{pad(player.number)}</span>
                      </span>
                      <strong className="player-art-number">{pad(player.number)}</strong>
                      <span className="player-art-mark">VIEW PLAYER PROFILE ↗</span>
                    </span>
                  </>
                )}
              </div>
              <div className="player-card-info">
                <span className="player-card-position">{singular(player.position)}</span>
                <h2>{player.name}</h2>
                <span className="player-card-number">{pad(player.number)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
