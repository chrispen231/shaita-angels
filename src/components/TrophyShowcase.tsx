import Link from "next/link";
import { Trophy } from "lucide-react";
import type { Honor } from "@/lib/content";
import styles from "./TrophyShowcase.module.css";

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
  );

  return (
    <section className={styles.showcase} aria-labelledby="trophy-showcase-title">
      <div className={styles.inner}>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>Shaita Angels FC · Honours</p>
          <h2 id="trophy-showcase-title">{title}</h2>
          <p>{subtitle}</p>
          {linkHref && <Link className={styles.link} href={linkHref}>{linkLabel}<span aria-hidden="true">↗</span></Link>}
        </header>

        {awards.length > 0 ? (
          <div className={styles.grid}>
            {awards.map((award) => (
              <article className={styles.card} key={award.name} aria-label={`${award.count} ${award.name} ${award.count === 1 ? "title" : "titles"}`}>
                <div className={styles.cardMain}>
                  <Trophy className={styles.trophy} size={66} strokeWidth={1.35} aria-hidden="true" />
                  <strong className={styles.count} aria-hidden="true">{String(award.count).padStart(2, "0")}</strong>
                  <span className={styles.srOnly}>{award.count} {award.count === 1 ? "title" : "titles"}</span>
                </div>
                <div className={styles.cardLabel}>
                  <span>{award.name}</span>
                  <small>{award.years.join(" · ")}</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>Club honours will appear here as they are recorded.</p>
        )}
      </div>
    </section>
  );
}
