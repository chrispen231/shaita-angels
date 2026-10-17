"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./media.module.css";

export type GalleryPhoto = {
  id: string;
  public_url: string;
  original_filename: string | null;
  uploaded_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB");
}

export function MediaGallery({ photos }: { photos: GalleryPhoto[] }) {
  // Index rather than the object itself, so prev/next can step through the set.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePhoto = activeIndex === null ? null : photos[activeIndex];

  // Remember what was focused so focus can return there on close.
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setActiveIndex(null);
    openerRef.current?.focus();
  }, []);

  const open = useCallback((index: number, trigger: HTMLElement) => {
    openerRef.current = trigger;
    setActiveIndex(index);
  }, []);

  const step = useCallback(
    (delta: number) => {
      setActiveIndex((current) => {
        if (current === null || photos.length === 0) return current;
        // Wrap around so the arrows never dead-end.
        return (current + delta + photos.length) % photos.length;
      });
    },
    [photos.length],
  );

  // Escape closes; arrows step through. Bound only while the lightbox is open.
  useEffect(() => {
    if (activeIndex === null) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, close, step]);

  // Stop the page behind the lightbox from scrolling, and move focus into the
  // dialog so keyboard and screen-reader users are not stranded behind it.
  useEffect(() => {
    if (activeIndex === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [activeIndex]);

  return (
    <>
      <div className="content-heading">
        <div>
          <p className="eyebrow">From the archive</p>
          <h2>Moments in red.</h2>
        </div>
        <span className="data-note">{photos.length} {photos.length === 1 ? "photo" : "photos"}</span>
      </div>

      {photos.length === 0 ? (
        <p className={styles.empty}>No gallery photos published yet. Check back soon.</p>
      ) : (
        <>
          <ul className={styles.grid}>
            {photos.map((photo, index) => (
              <li key={photo.id} className={styles.card}>
                {/*
                  An <a> with a real href, not a <button>: if JavaScript fails to
                  load or hydrate (older iOS Safari), the link still opens the
                  full-size photo natively. When JS does run we intercept the
                  click and open the in-page lightbox instead.

                  A <button>/<a> may only contain phrasing content, so the
                  thumbnail wrapper and caption are <span>s -- <div> here is
                  invalid HTML that engines may re-parent, breaking the target.
                */}
                <a
                  className={styles.figure}
                  href={photo.public_url}
                  target="_blank"
                  rel="noopener"
                  onClick={(event) => {
                    // Let modified clicks (new tab, etc.) behave normally.
                    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                    event.preventDefault();
                    open(index, event.currentTarget);
                  }}
                  aria-label={`View ${photo.original_filename ?? "photo"} full size`}
                >
                  <span className={styles.thumb}>
                    <Image
                      src={photo.public_url}
                      alt={photo.original_filename ?? "Shaita Angels gallery photo"}
                      fill
                      unoptimized
                      sizes="(max-width: 720px) 100vw, 33vw"
                    />
                  </span>
                  <span className={styles.figcaption}>
                    <span className={styles.caption}>Shaita Angels FC</span>
                    <span className={styles.date}>{formatDate(photo.uploaded_at)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          {activePhoto && (
            <div
              className={styles.lightbox}
              role="dialog"
              aria-modal="true"
              aria-label={activePhoto.original_filename ?? "Photo viewer"}
              onClick={close}
            >
              <button
                ref={closeRef}
                type="button"
                className={styles.lightboxClose}
                onClick={close}
                aria-label="Close"
              >
                ×
              </button>

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      step(-1);
                    }}
                    aria-label="Previous photo"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className={`${styles.lightboxNav} ${styles.lightboxNext}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      step(1);
                    }}
                    aria-label="Next photo"
                  >
                    ›
                  </button>
                </>
              )}

              <figure className={styles.lightboxFigure} onClick={(event) => event.stopPropagation()}>
                <span className={styles.lightboxImage}>
                  {/* `fill` + object-fit: contain scales the photo up to the
                      viewport-sized box while preserving its aspect ratio. */}
                  <Image
                    src={activePhoto.public_url}
                    alt={activePhoto.original_filename ?? "Shaita Angels gallery photo"}
                    fill
                    unoptimized
                    sizes="92vw"
                    priority
                  />
                  {/* A 544KB photo over mobile data takes a moment; without this
                      the black backdrop looks like the tap did nothing. */}
                  <span className={styles.lightboxSpinner} aria-hidden="true" />
                </span>
                <figcaption className={styles.lightboxFigcaption}>
                  <span className={styles.lightboxCaption}>Shaita Angels FC</span>
                  <span className={styles.lightboxDate}>
                    {formatDate(activePhoto.uploaded_at)}
                  </span>
                  {photos.length > 1 && (
                    <span className={styles.lightboxCount}>
                      {(activeIndex ?? 0) + 1} / {photos.length}
                    </span>
                  )}
                </figcaption>
              </figure>
            </div>
          )}
        </>
      )}

      <p className="data-note gallery-note">
        Photos supplied with the project. Dates and match captions will be added when confirmed by the
        club.
      </p>
    </>
  );
}
