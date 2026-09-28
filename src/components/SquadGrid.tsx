"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { playerPhotos, squad } from "@/data/site";

const players = squad.flatMap((group) =>
  group.players.map((player) => ({ ...player, position: group.position })),
).sort((a, b) => a.number - b.number);
const filters = ["All", ...squad.map((group) => group.position)];

export default function SquadGrid() {
  const [active, setActive] = useState("All");
  const visiblePlayers = active === "All" ? players : players.filter((player) => player.position === active);

  return (
    <>
      <div className="squad-filter-bar">
        <div className="squad-filters" role="group" aria-label="Filter players by position">
          {filters.map((filter) => (
            <button className={active === filter ? "is-active" : ""} type="button" key={filter}
              aria-pressed={active === filter} onClick={() => setActive(filter)}>{filter}</button>
          ))}
        </div>
        <span className="squad-count" aria-live="polite">{visiblePlayers.length} players</span>
      </div>
      <div className="squad-cards">
        {visiblePlayers.map((player) => (
          <Link className="player-card" href={`/team/player/${player.number}`} key={player.number}
            aria-label={`${player.name}, number ${player.number}, ${player.position.replace(/s$/, "")}. View player profile`}>
            <div className="player-card-art">
              {playerPhotos[player.name] ? <div className={`player-photo-set ${playerPhotos[player.name].length > 1 ? "has-alternate" : ""}`}>
                <Image className="player-photo player-photo-primary" src={playerPhotos[player.name][0]} alt={`${player.name} in Shaita Angels colours`} fill priority={player.number === 2} sizes="(max-width: 680px) 50vw, (max-width: 1000px) 33vw, 25vw" />
                {playerPhotos[player.name][1] && <Image className="player-photo player-photo-alternate" src={playerPhotos[player.name][1]} alt={`${player.name}, alternate portrait`} fill sizes="(max-width: 680px) 50vw, (max-width: 1000px) 33vw, 25vw" />}
              </div> : <>
                <span className="player-art-face player-art-front" aria-hidden="true">
                  <span className="player-art-kicker">SHAITA ANGELS FC</span>
                  <span className="player-shirt"><Image src="/shaita-angels-logo.png" alt="" width={42} height={42} /></span>
                  <strong className="player-art-number">{String(player.number).padStart(2, "0")}</strong>
                  <span className="player-art-mark">CAREYSBURG · LIBERIA</span>
                </span>
                <span className="player-art-face player-art-reverse" aria-hidden="true">
                  <span className="player-art-kicker">THE ANGELS · {player.position.toUpperCase()}</span>
                  <span className="player-shirt player-shirt-back"><span>{String(player.number).padStart(2, "0")}</span></span>
                  <strong className="player-art-number">{String(player.number).padStart(2, "0")}</strong>
                  <span className="player-art-mark">VIEW PLAYER PROFILE ↗</span>
                </span>
              </>}
            </div>
            <div className="player-card-info">
              <span className="player-card-position">{player.position.replace(/s$/, "")}</span>
              <h2>{player.name}</h2>
              <span className="player-card-number">{String(player.number).padStart(2, "0")}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
