"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./HeroSlideshow.module.css";

export type HeroSlide = {
  slug: string;
  title: string;
  category: string;
  image: string;
  imageAlt: string;
};

const ROTATE_MS = 6000;

/**
 * Auto-rotating hero images drawn from featured news.
 *
 * Design rules worth keeping:
 *
 * - Only the first slide is `priority`. The hero is the page's LCP element, so
 *   eagerly loading every slide would delay the thing we are trying to speed up.
 * - The club headline stays fixed; only the photo and a small "Latest" link
 *   change. A headline that swaps every six seconds stops being a message.
 * - Rotation pauses on hover, on keyboard focus, when the tab is hidden, and
 *   whenever the visitor has asked for reduced motion. Auto-advancing content
 *   that cannot be stopped fails WCAG 2.2.2.
 * - Controls are always present rather than appearing on hover, because touch
 *   devices have no hover.
 */
export default function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  /*
   * Hover/focus pausing and the explicit pause button are tracked separately.
   * Sharing one flag made the button lie: hovering the controls already paused
   * the rotation and flipped the label to "play", so the visitor's first click
   * resumed instead of pausing. Only `userPaused` drives the button's state.
   */
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);

  // Refs let the interval read current values without re-subscribing each tick.
  const pausedRef = useRef(false);
  const reducedRef = useRef(false);
  const count = slides.length;

  useEffect(() => {
    pausedRef.current = userPaused || hoverPaused;
  }, [userPaused, hoverPaused]);

  useEffect(() => {
    if (count < 2) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedRef.current = query.matches;
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [count]);

  useEffect(() => {
    if (count < 2) return;
    const timer = window.setInterval(() => {
      // A hidden tab keeps firing timers; skip so the visitor does not return to
      // a slideshow that has silently advanced through everything.
      if (pausedRef.current || reducedRef.current || document.hidden) return;
      setIndex((current) => (current + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [count]);

  const goTo = useCallback((next: number) => {
    setIndex(((next % count) + count) % count);
  }, [count]);

  const active = slides[index];
  if (!active) return null;

  return (
    <div
      className={styles.slideshow}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocusCapture={() => setHoverPaused(true)}
      onBlurCapture={() => setHoverPaused(false)}
    >
      {slides.map((slide, slideIndex) => (
        <div
          key={slide.slug}
          className={`${styles.slide} ${slideIndex === index ? styles.slideActive : ""}`}
          aria-hidden={slideIndex !== index}
        >
          <Image
            src={slide.image}
            alt={slide.imageAlt}
            fill
            /* Only the visible slide loads eagerly. */
            priority={slideIndex === 0}
            loading={slideIndex === 0 ? undefined : "lazy"}
            sizes="100vw"
            className={styles.image}
          />
        </div>
      ))}

      {count > 1 && (
        <>
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => goTo(index - 1)}
              aria-label="Previous featured story"
            >
              ‹
            </button>
            <ul className={styles.dots}>
              {slides.map((slide, dotIndex) => (
                <li key={slide.slug}>
                  <button
                    type="button"
                    className={`${styles.dot} ${dotIndex === index ? styles.dotActive : ""}`}
                    onClick={() => goTo(dotIndex)}
                    aria-label={`Show featured story ${dotIndex + 1} of ${count}`}
                    aria-current={dotIndex === index}
                  />
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => goTo(index + 1)}
              aria-label="Next featured story"
            >
              ›
            </button>
            <button
              type="button"
              className={styles.pause}
              onClick={() => setUserPaused((value) => !value)}
              aria-label={userPaused ? "Resume slideshow" : "Pause slideshow"}
              aria-pressed={userPaused}
            >
              {userPaused ? "▶" : "❚❚"}
            </button>
          </div>

          <div className={styles.caption} aria-live="polite">
            <span className={styles.captionLabel}>Featured</span>
            <Link className={styles.captionLink} href={`/news/${active.slug}`}>
              {active.title}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
