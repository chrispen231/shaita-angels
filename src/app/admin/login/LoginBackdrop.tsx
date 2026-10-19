"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  LOGIN_VIDEOS,
  createLoginVideoStore,
  nextFailedIndex,
} from "@/lib/admin/login-videos";
import styles from "./LoginBackdrop.module.css";

/** Server render: no video. The element only ever exists on the client. */
const noVideo = () => null;

/**
 * The full-screen video behind the admin sign-in card.
 *
 * Exactly one <video> is ever in the DOM: an index is resolved once on mount
 * (see createLoginVideoStore), that single source is rendered, and a failed
 * load advances to the next untried index rather than leaving a black frame.
 * When video cannot be used at all - reduced motion, every source failed,
 * autoplay refused - the element is dropped and the CSS gradient underneath
 * carries the design.
 *
 * The element is decorative: `aria-hidden`, no controls, not focusable, so a
 * screen reader never lands on it.
 */
export default function LoginBackdrop() {
  // One store per mount. useSyncExternalStore reads the server snapshot (null)
  // during hydration and the real index immediately after, which is exactly the
  // "resolve on the client, never set state from an effect" shape this needs.
  const [store] = useState(() =>
    createLoginVideoStore({
      reducedMotion: () =>
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    }),
  );
  const initial = useSyncExternalStore(store.subscribe, store.getSnapshot, noVideo);

  const [index, setIndex] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  /** Indexes already tried this visit, so a failure walks forward instead of looping. */
  const triedRef = useRef<Set<number>>(new Set());
  /** Guards the adopt effect against React's development double-invoke. */
  const adoptedRef = useRef(false);

  // Adopt the resolved index once, and note it as tried.
  useEffect(() => {
    if (adoptedRef.current || initial === null) return;
    adoptedRef.current = true;
    triedRef.current.add(initial);
    setIndex(initial);
  }, [initial]);

  const advance = useCallback(() => {
    const next = nextFailedIndex(index ?? 0, triedRef.current, LOGIN_VIDEOS.length);
    if (next === null) {
      setFailed(true);
      return;
    }
    triedRef.current.add(next);
    setReady(false);
    setIndex(next);
  }, [index]);

  // Autoplay can still be refused even when muted. Treat that as a load failure
  // so the gradient takes over instead of a frozen first frame.
  useEffect(() => {
    if (index === null || failed) return;
    const video = videoRef.current;
    if (!video) return;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(() => advance());
    }
  }, [index, failed, advance]);

  return (
    <div className={styles.backdrop} aria-hidden="true">
      <div className={`${styles.gradient} ${failed || index === null ? styles.gradientVisible : ""}`} />
      {index !== null && !failed && (
        <video
          key={index}
          ref={videoRef}
          className={`${styles.video} ${ready ? styles.videoReady : ""}`}
          src={LOGIN_VIDEOS[index]}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          tabIndex={-1}
          onCanPlay={() => setReady(true)}
          onError={advance}
        />
      )}
      <div className={styles.overlay} />
      <div className={styles.vignette} />
    </div>
  );
}
