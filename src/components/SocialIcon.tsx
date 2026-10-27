import { siFacebook, siInstagram, siTiktok, siWhatsapp, siX, siYoutube, type SimpleIcon } from "simple-icons";
import styles from "./SocialIcon.module.css";

/**
 * Platform icons as one set: a solid ink plate with each platform's official
 * mark (from Simple Icons) reversed out in white. Using the brands' own artwork
 * keeps the marks recognisable; the shared plate keeps the row reading as a set
 * and stays sharp on high-density screens.
 *
 * Decorative only: the link around the icon carries the accessible name.
 */
const MARKS: Record<string, SimpleIcon> = {
  facebook: siFacebook,
  instagram: siInstagram,
  youtube: siYoutube,
  whatsapp: siWhatsapp,
  tiktok: siTiktok,
  x: siX,
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
      {/* The 24-unit mark, scaled to 16 and centred on the 28-unit plate. */}
      <path d={mark.path} fill="#fff" transform="translate(6 6) scale(0.6667)" />
    </svg>
  );
}
