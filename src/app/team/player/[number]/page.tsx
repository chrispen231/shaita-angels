import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getSquadPlayer, pad, singular } from "@/lib/content";
import { playerPhotos } from "@/data/site";

export const dynamic = "force-dynamic";

/**
 * A player profile, keyed by squad number.
 *
 * No generateStaticParams: the squad is database-driven now, so a newly added
 * player must be reachable without a rebuild.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  const player = await getSquadPlayer(Number(number));
  if (!player) return { title: "Player not found" };
  return { title: player.name };
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;

  // Guard the segment before it reaches the database: Number("") is 0 and
  // Number("abc") is NaN, and neither should produce a lookup.
  if (!/^\d{1,2}$/.test(number)) notFound();

  const player = await getSquadPlayer(Number(number));
  if (!player) notFound();

  const photos = playerPhotos[player.name] ?? [];
  const photo = photos[0] ?? player.photo;

  return (
    <div className="player-profile-page">
      <div className="wrap player-profile-back">
        <Link href="/team">← Back to the squad</Link>
      </div>

      <section className="player-profile-hero wrap">
        <div className={`player-profile-art ${photo ? "has-player-photo" : ""}`}>
          {photo ? (
            <Image src={photo} alt={player.photoAlt ?? `${player.name} in Shaita Angels colours`} fill priority sizes="(max-width: 680px) 100vw, 40vw" />
          ) : (
            <>
              <span>SHAITA ANGELS FC · CAREYSBURG</span>
              <div className="player-profile-shirt">
                <Image src="/shaita-angels-logo.png" alt="" width={52} height={52} />
                <strong>{pad(player.number)}</strong>
              </div>
              <i>WOMEN&apos;S FIRST TEAM</i>
            </>
          )}
        </div>
        <div className="player-profile-heading">
          <p className="eyebrow">{singular(player.position)} · First team</p>
          <span className="profile-shirt-number">{pad(player.number)}</span>
          <h1>{player.name}</h1>
          <p>Shaita Angels FC · Careysburg, Liberia</p>
        </div>
      </section>

      <section className="wrap player-profile-bio">
        <p className="eyebrow">Player profile</p>
        {player.bio ? (
          <>
            <h2>Biography</h2>
            {player.bio.split(/\n\s*\n/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </>
        ) : (
          <>
            <h2>Biography coming soon.</h2>
            <p>
              The club has not yet provided a confirmed player biography. This profile currently
              shows the confirmed squad details only.
            </p>
          </>
        )}
        <Link className="text-link" href="/team">
          Meet the full squad <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </div>
  );
}
