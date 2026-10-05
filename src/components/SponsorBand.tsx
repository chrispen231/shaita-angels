import Image from "next/image";
import type { SiteSettings, Sponsor } from "@/types/sponsors";
import { sponsorLogoUrl } from "@/lib/sponsors/logo-url";
import styles from "./SponsorBand.module.css";

/**
 * Sponsor band and social row, shown above the footer on every page.
 *
 * Structure follows the pattern clubs use: principals in their own row with
 * generous air, then partner rows beneath, then a social row on the same light
 * ground. Three tiers rather than two, because a club with four sponsors would
 * otherwise spend half the band on principals.
 *
 * Accessibility notes, which are deliberate departures from the reference site:
 *   * every social icon carries a visually hidden platform name. The reference
 *     band's icons have no accessible name at all.
 *   * every sponsor logo has alt text with the sponsor's name.
 *   * outbound links use rel="sponsored noopener" so paid links neither pass
 *     link equity nor expose window.opener.
 *   * 28px icons sit inside 44px tap targets via padding, not a bigger glyph.
 */

type Props = {
  sponsors: Sponsor[] | null;
  settings: SiteSettings | null;
};

/** Local artwork, used until a sponsor has a logo in storage. */
const FALLBACK_LOGO: Record<string, string> = {
  "BETTOMAX": "/sponsors/bettomax.png",
  "NEEV Liberia": "/sponsors/neev.png",
  Ambivert: "/sponsors/ambivert.png",
};

/** Platform icons are stored once and referenced by slug, never uploaded per entry. */
const SOCIAL_ICON: Record<string, string> = {
  facebook: "/sponsors/social-facebook.png",
  instagram: "/sponsors/social-instagram.png",
  youtube: "/sponsors/social-youtube.png",
  whatsapp: "/sponsors/social-whatsapp.png",
  tiktok: "/sponsors/social-tiktok.png",
  x: "/sponsors/social-x.png",
};

export default function SponsorBand({ sponsors, settings }: Props) {
  const tiers = groupTiers(sponsors ?? []);
  const handles = (settings?.social_handles ?? []).filter((handle) => handle.is_published);

  // Nothing to show until Supabase is configured and rows exist.
  if (tiers.every((row) => row.length === 0) && handles.length === 0) return null;

  return (
    <section className={styles.band} aria-label="Partners and social media">
      <div className="wrap">
        {tiers.map((row, index) =>
          row.length === 0 ? null : (
            <div className={styles.tier} key={index} data-tier={index + 1}>
              {row.map((sponsor) => (
                <SponsorLogo key={sponsor.id} sponsor={sponsor} />
              ))}
            </div>
          ),
        )}
      </div>

      {handles.length > 0 && (
        <>
          <div className="wrap">
            <ul className={styles.social}>
              {handles.map((handle) => (
                <li key={`${handle.platform}-${handle.url}`}>
                  <a
                    className={styles.socialLink}
                    href={handle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {SOCIAL_ICON[handle.platform] ? (
                      <Image
                        src={SOCIAL_ICON[handle.platform]}
                        alt=""
                        width={28}
                        height={28}
                        className={styles.socialIcon}
                      />
                    ) : (
                      <span className={styles.socialFallback} aria-hidden="true">
                        {handle.label.slice(0, 2)}
                      </span>
                    )}
                    <span className={styles.srOnly}>
                      {handle.label} (opens in a new tab)
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

function SponsorLogo({ sponsor }: { sponsor: Sponsor }) {
  const stored = sponsorLogoUrl(sponsor.logo_path);
  const src = stored ?? FALLBACK_LOGO[sponsor.name] ?? null;
  const label = sponsor.alt_text?.trim() || sponsor.name;

  const inner = src ? (
    <Image
      src={src}
      alt={label}
      width={160}
      height={92}
      className={styles.logo}
      sizes="(max-width: 680px) 40vw, 160px"
    />
  ) : (
    // A sponsor with no artwork yet still gets a slot, rendered as text so the
    // band does not silently drop them.
    <span className={styles.logoText}>{sponsor.name}</span>
  );

  if (!sponsor.url) {
    return <span className={styles.slot}>{inner}</span>;
  }

  return (
    <a
      className={styles.slot}
      href={sponsor.url}
      target="_blank"
      rel="sponsored noopener"
    >
      {inner}
      <span className={styles.srOnly}>
        {sponsor.name} (sponsored link, opens in a new tab)
      </span>
    </a>
  );
}

/** Buckets sponsors by tier, preserving the order the query returned. */
function groupTiers(sponsors: Sponsor[]) {
  const buckets: Sponsor[][] = [[], [], []];
  for (const sponsor of sponsors) {
    const index = Math.min(Math.max(sponsor.tier, 1), 3) - 1;
    buckets[index].push(sponsor);
  }
  return buckets;
}