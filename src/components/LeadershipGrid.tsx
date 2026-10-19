import Image from "next/image";
import type { LeadershipMember } from "@/lib/content";
import styles from "./LeadershipGrid.module.css";

export default function LeadershipGrid({ leaders }: { leaders: LeadershipMember[] }) {
  if (leaders.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.mark} aria-hidden="true">SA</span>
        <div>
          <p className="eyebrow">The people behind the club</p>
          <h2>Leadership profiles coming soon.</h2>
          <p>Club leadership names and roles will appear here once confirmed and published.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {leaders.map((leader) => (
        <article className={styles.card} key={leader.id}>
          <div className={styles.portrait}>
            {leader.photo ? (
              <Image
                src={leader.photo}
                alt={leader.photoAlt ?? `${leader.name}, ${leader.role} at Shaita Angels FC`}
                fill
                unoptimized
                sizes="(max-width: 680px) 100vw, (max-width: 1000px) 50vw, 33vw"
              />
            ) : (
              <span aria-hidden="true">{leader.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
            )}
          </div>
          <div className={styles.info}>
            <p>{leader.role}</p>
            <h2>{leader.name}</h2>
            {leader.bio && <div className={styles.bio}>{leader.bio}</div>}
          </div>
        </article>
      ))}
    </div>
  );
}
