import Link from "next/link";
import { Trophy } from "lucide-react";
import type { Honor } from "@/lib/content";
import styles from "./TrophyShowcase.module.css";

function TrophyIllustration({ kind }: { kind: "orange" | "super" }) {
  if (kind === "orange") {
    return (
      <svg className={styles.trophyArt} viewBox="0 0 140 180" aria-hidden="true">
        <defs>
          <linearGradient id="orange-silver" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#7f8990" />
            <stop offset=".22" stopColor="#f5f5f1" />
            <stop offset=".48" stopColor="#9da8ae" />
            <stop offset=".72" stopColor="#fff" />
            <stop offset="1" stopColor="#727d83" />
          </linearGradient>
          <linearGradient id="orange-wood" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#ffb33e" />
            <stop offset="1" stopColor="#8e3c12" />
          </linearGradient>
        </defs>
        <ellipse cx="70" cy="169" rx="45" ry="7" fill="#321a14" opacity=".35" />
        <path d="M48 17h44l-8 73 13 47H43l13-47z" fill="url(#orange-silver)" stroke="#d8e0e2" strokeWidth="2" />
        <path d="M53 23h7l5 72-11 39h-8l13-47zM80 23h7l-6 64 14 47h-8L76 90z" fill="#171b20" />
        <path d="M50 94l-18 12-12 20 14 12 36-4 5-25z" fill="#c7ae70" stroke="#f2d995" strokeWidth="2" />
        <path d="M85 97l27 11 9 18-18 13-32-6-5-23z" fill="#ad9356" stroke="#f2d995" strokeWidth="2" />
        <path d="M59 137h22v9H59z" fill="#737c7e" />
        <path d="M36 146h68v9H36z" fill="#c9ced0" stroke="#f7f7f4" strokeWidth="2" />
        <path d="M24 154h92v11H24z" fill="url(#orange-wood)" stroke="#f4a52b" strokeWidth="2" />
        <path d="M56 31h5v56h-5zm23 0h4v45h-4z" fill="#fff" opacity=".55" />
      </svg>
    );
  }

  return (
    <svg className={styles.trophyArt} viewBox="0 0 140 180" aria-hidden="true">
      <defs>
        <linearGradient id="super-gold" x1="0" x2="1" y1="0" y2="0">
          <stop stopColor="#8d6417" />
          <stop offset=".25" stopColor="#ffe99a" />
          <stop offset=".52" stopColor="#c2932d" />
          <stop offset=".78" stopColor="#fff1b3" />
          <stop offset="1" stopColor="#8d6417" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="169" rx="45" ry="7" fill="#05090d" opacity=".45" />
      <circle cx="70" cy="15" r="8" fill="url(#super-gold)" stroke="#ffe99a" strokeWidth="2" />
      <path d="M61 23h18l-4 10 18 10-7 16H54l-7-16 18-10z" fill="url(#super-gold)" stroke="#ffe99a" strokeWidth="2" />
      <path d="M53 43c-20-4-25 11-15 30l15 14M87 43c20-4 25 11 15 30L87 87" fill="none" stroke="url(#super-gold)" strokeWidth="7" />
      <path d="M48 49h44l-7 44-15 17-15-17z" fill="url(#super-gold)" stroke="#ffe99a" strokeWidth="2" />
      <path d="M63 109h14v17H63z" fill="url(#super-gold)" />
      <path d="M53 124h34l8 9H45z" fill="url(#super-gold)" stroke="#ffe99a" strokeWidth="2" />
      <path d="M43 133h54v19H43z" fill="#111820" stroke="#3c4650" strokeWidth="2" />
      <path d="M49 139h42v2H49zM54 145h32v3H54z" fill="#e8b63f" />
      <path d="M57 54h5l-4 34h-5zM81 54h5l-6 29h-4z" fill="#fff1b3" opacity=".65" />
    </svg>
  );
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
                  {award.name.toLocaleLowerCase() === "orange cup" ? (
                    <TrophyIllustration kind="orange" />
                  ) : award.name.toLocaleLowerCase() === "lfa women’s super cup" ? (
                    <TrophyIllustration kind="super" />
                  ) : (
                    <Trophy className={styles.trophy} size={66} strokeWidth={1.35} aria-hidden="true" />
                  )}
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
