import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { playerPhotos, squad } from "@/data/site";

const players = squad.flatMap((group) => group.players.map((player) => ({ ...player, position: group.position })));

export function generateStaticParams() {
  return players.map((player) => ({ number: String(player.number) }));
}

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }): Promise<Metadata> {
  const { number } = await params;
  const player = players.find((item) => item.number === Number(number));
  return player ? { title: player.name } : {};
}

export default async function PlayerProfilePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const player = players.find((item) => item.number === Number(number));
  if (!player) notFound();

  return (
    <div className="player-profile-page">
      <div className="wrap player-profile-back"><Link href="/team">← Back to the squad</Link></div>
      <section className="player-profile-hero wrap">
        <div className={`player-profile-art ${playerPhotos[player.name] ? "has-player-photo" : ""}`}>
          {playerPhotos[player.name] ? <Image src={playerPhotos[player.name][0]} alt={`${player.name} in Shaita Angels colours`} fill priority sizes="(max-width: 680px) 100vw, 40vw" /> : <>
            <span>SHAITA ANGELS FC · CAREYSBURG</span>
            <div className="player-profile-shirt"><Image src="/shaita-angels-logo.png" alt="" width={52} height={52} /><strong>{String(player.number).padStart(2, "0")}</strong></div>
            <i>WOMEN’S FIRST TEAM</i>
          </>}
        </div>
        <div className="player-profile-heading">
          <p className="eyebrow">{player.position.replace(/s$/, "")} · First team</p>
          <span className="profile-shirt-number">{String(player.number).padStart(2, "0")}</span>
          <h1>{player.name}</h1>
          <p>Shaita Angels FC · Careysburg, Liberia</p>
        </div>
      </section>
      <section className="wrap player-profile-bio">
        <p className="eyebrow">Player profile</p>
        <h2>Biography coming soon.</h2>
        <p>The club has not yet provided a confirmed player biography. This profile currently shows the confirmed squad details only.</p>
        <Link className="text-link" href="/team">Meet the full squad <span aria-hidden="true">↗</span></Link>
      </section>
    </div>
  );
}
