import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Trophy } from "lucide-react";
import type { Honor } from "@/lib/content";
import styles from "./TrophyShowcase.module.css";

/*
 * The club supplied artwork for the two cups the Angels have won. Both pieces
 * are flat yellow on the same deep navy, so the card behind them is painted in
 * that navy and the artwork sits in the panel without a visible edge. The
 * match is loose on purpose: honours are typed by hand in the admin, so
 * "Orange Cup" and "FA Orange Cup" both have to land on the same artwork.
 */
const TROPHY_ART = [
  {
    match: /orange cup/i,
    src: "/trophies/fa-orange-cup.png",
    alt: "The FA Women’s Orange Cup",
  },
  {
    match: /super cup/i,
    src: "/trophies/lfa-super-cup.png",
    alt: "The LFA Women’s Super Cup",
  },
];

function trophyArtFor(name: string) {
  return TROPHY_ART.find((art) => art.match.test(name)) ?? null;
}

type TrophyShowcaseProps = {
  honors: Honor[];
  title?: string;
  subtitle?: string;
  linkHref?: string;
  linkLabel?: string;
};

export default function TrophyShowcase({
  honors,
  title = "Our trophies",
  subtitle = "Every title is a chapter in the Shaita Angels story.",
  linkHref,
  linkLabel = "View all club honours",
}: TrophyShowcaseProps) {
  const awards = Array.from(
    honors.reduce((groups, honor) => {
      const key = honor.name.trim().toLocaleLowerCase();
      const existing = groups.get(key);
      if (existing) {
        existing.years.push(honor.year);
        existing.count += 1;
      } else {
        groups.set(key, { name: honor.name.trim(), years: [honor.year], count: 1 });
      }
      return groups;
    }, new Map<string, { name: string; years: string[]; count: number }>()).values(),
  ).map((award) => ({ ...award, years: [...award.years].sort() }));

  return (
    <section className={styles.showcase} aria-labelledby="trophy-showcase-title">
      <div className={styles.inner}>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>Shaita Angels FC · Honours</p>
          <h2 id="trophy-showcase-title">{title}</h2>
          <p>{subtitle}</p>
          {linkHref && <Link className={styles.link} href={linkHref}>{linkLabel}<span aria-hidden="true"><ArrowUpRight className="inline-icon" /></span></Link>}
        </header>

        {awards.length > 0 ? (
          <div className={styles.grid}>
            {awards.map((award) => {
              const art = trophyArtFor(award.name);
              return (
                <article className={styles.card} key={award.name} aria-label={`${award.count} ${award.name} ${award.count === 1 ? "title" : "titles"}`}>
                  <div className={styles.cardMain}>
                    {art ? (
                      <Image
                        className={styles.trophyArt}
                        src={art.src}
                        alt={art.alt}
                        width={120}
                        height={180}
                        sizes="(max-width: 600px) 84px, 120px"
                      />
                    ) : (
                      <Trophy className={styles.trophy} size={66} strokeWidth={1.35} aria-hidden="true" />
                    )}
                    <strong className={styles.count} aria-hidden="true">{award.count}X</strong>
                    <span className={styles.srOnly}>{award.count} {award.count === 1 ? "title" : "titles"}</span>
                  </div>
                  <div className={styles.cardLabel}>
                    <span>{award.name}</span>
                    <small>{award.years.join(" · ")}</small>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.empty}>Club honours will appear here as they are recorded.</p>
        )}
      </div>
    </section>
  );
}
