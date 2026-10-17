"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
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

  const close = useCallback(() => setActiveIndex(null), []);
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

  // Stop the page behind the lightbox from scrolling.
  useEffect(() => {
    if (activeIndex === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
                <button
                  type="button"
                  className={styles.figure}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`View ${photo.original_filename ?? "photo"} full size`}
                >
                  <div className={styles.thumb}>
                    <Image
                      src={photo.public_url}
                      alt={photo.original_filename ?? "Shaita Angels gallery photo"}
                      fill
                      unoptimized
                      sizes="(max-width: 720px) 100vw, 33vw"
                    />
                  </div>
                  <figcaption className={styles.figcaption}>
                    <span className={styles.caption}>Shaita Angels FC</span>
                    <span className={styles.date}>
                      {formatDate(photo.uploaded_at)}
                    </span>
                  </figcaption>
                </button>
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

              <figure
                className={styles.lightboxFigure}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.lightboxImage}>
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
                </div>
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
