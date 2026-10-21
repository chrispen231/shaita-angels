import type { ReactNode } from "react";
import styles from "./SocialIcon.module.css";

/**
 * Platform icons, drawn as one set: a solid ink plate with the mark reversed out
 * in white. The supplied PNGs mixed filled plates with an outline Instagram glyph,
 * so they never read as a set; drawing them here keeps every platform the same
 * variant, size and weight, and stays sharp on high-density screens.
 *
 * Decorative only: the link around the icon carries the accessible name.
 */
const MARKS: Record<string, ReactNode> = {
  facebook: (
    <path d="M15.6 28v-10.8h3.3l.5-3.9h-3.8v-2.4c0-1.1.3-1.9 1.9-1.9h2V5.6c-.4-.1-1.6-.2-2.9-.2-2.9 0-4.9 1.8-4.9 5v2.9H8.4v3.9h3.3V28z" />
  ),
  instagram: (
    <>
      <rect x="6.5" y="6.5" width="15" height="15" rx="4.5" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="14" cy="14" r="3.6" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="18.4" cy="9.6" r="1" />
    </>
  ),
  youtube: <path d="M11 8.8v10.4l8.6-5.2z" />,
  whatsapp: (
    <>
      <path
        d="M7.6 20.6l.34-3.6A7 7 0 1 1 11.04 19.84z"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M11.6 11.2c.2-.5.5-.6.8-.6h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.4.5c-.1.1-.2.3 0 .5.4.7 1.4 1.8 2.6 2.3.2.1.4.1.5-.1l.6-.7c.1-.2.3-.2.5-.1l1.6.8c.2.1.3.2.3.4 0 .4-.1 1-.6 1.4-.5.4-1.3.6-2.2.3-1.6-.5-3.4-2-4.3-3.6-.6-1.1-.6-2.2-.4-2.7z" />
    </>
  ),
  tiktok: (
    <path d="M15.3 6.5h2.6c.2 1.9 1.6 3.4 3.6 3.6v2.7c-1.3 0-2.6-.4-3.6-1.1v5.6c0 2.9-2.3 5.2-5.2 5.2S7.5 20.2 7.5 17.3s2.3-5.2 5.2-5.2c.3 0 .5 0 .8.1V15c-.3-.1-.5-.2-.8-.2-1.3 0-2.4 1.1-2.4 2.4s1.1 2.4 2.4 2.4 2.4-1.1 2.4-2.4z" />
  ),
  x: (
    <path
      transform="translate(7.5 7.5) scale(0.54)"
      d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"
    />
  ),
};

export default function SocialIcon({ platform, label }: { platform: string; label: string }) {
  const mark = MARKS[platform];

  // A platform added to the data before it has artwork still gets a plate.
  if (!mark) {
    return (
      <span className={styles.fallback} aria-hidden="true">
        {label.slice(0, 2)}
      </span>
    );
  }

  return (
    <svg className={styles.icon} viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <rect width="28" height="28" rx="6" fill="currentColor" />
      <g fill="#fff">{mark}</g>
    </svg>
  );
}
