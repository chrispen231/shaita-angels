"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";
import type { Honor } from "@/lib/content";
import styles from "./HonorsTicker.module.css";

function HonorsGroup({ honors, hidden = false }: { honors: Honor[]; hidden?: boolean }) {
  return (
    <div className={styles.group} aria-hidden={hidden ? true : undefined}>
      {honors.map((honor, index) => (
        <span className={styles.item} key={`${honor.year}-${honor.name}-${index}`}>
          <span className={styles.year}>{honor.year}</span>
          <span>{honor.name}</span>
        </span>
      ))}
    </div>
  );
}

export default function HonorsTicker({ honors }: { honors: Honor[] }) {
  const [paused, setPaused] = useState(false);
  if (honors.length === 0) return null;

  return (
    <section className={styles.ticker} aria-label="Club honours">
      <div className={`${styles.track} ${paused ? styles.paused : ""}`}>
        <HonorsGroup honors={honors} />
        <HonorsGroup honors={honors} hidden />
      </div>
      <button
        className={styles.toggle}
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-label={paused ? "Resume honours ticker" : "Pause honours ticker"}
        aria-pressed={paused}
      >
        {paused ? <Play aria-hidden="true" size={15} /> : <Pause aria-hidden="true" size={15} />}
      </button>
    </section>
  );
}
